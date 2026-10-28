import { and, eq, sql, asc } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
  contests,
  contestSubjects,
  contestTopics,
  workspaces,
  profiles,
  studyPlans,
  subjects,
  topics,
  studySessions,
  reviews,
  errorReasons,
  errorEntries,
  reminders,
} from "./schema.js";
import {
  names,
  today,
  addDays,
  validateSession,
  validateReview,
  DomainError,
  type State,
  type Command,
} from "./domain.js";
export type Database = PostgresJsDatabase;
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
export type Executor = Database | Transaction;

export class ConflictError extends Error {}

export async function initializeWorkspace(db: Database, workspaceId = 1) {
  await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(workspaces)
      .values({ id: workspaceId })
      .onConflictDoNothing()
      .returning();
    if (!inserted.length) return;
    await tx.insert(profiles).values({ workspaceId, name: "" });
    const [plan] = await tx
      .insert(studyPlans)
      .values({ workspaceId, startDate: today(), dailyHours: 2 })
      .returning();
    const createdSubjects = await tx
      .insert(subjects)
      .values(
        names.map((name, position) => ({
          planId: plan!.id,
          name,
          position,
        })),
      )
      .returning({ id: subjects.id });
    await tx.insert(topics).values(
      createdSubjects.map(({ id }) => ({
        subjectId: id,
        name: "Revisão de Véspera",
        kind: "eve_review" as const,
      })),
    );
  });
}

// This DTO is assembled for API compatibility. No document is stored in PostgreSQL.
export async function readWorkspace(
  db: Executor,
  workspaceId = 1,
  includeContests = true,
): Promise<{ version: number; data: State }> {
  const [header] = await db
    .select({
      version: workspaces.version,
      name: profiles.name,
      plan: studyPlans,
    })
    .from(workspaces)
    .innerJoin(profiles, eq(profiles.workspaceId, workspaces.id))
    .innerJoin(studyPlans, eq(studyPlans.workspaceId, workspaces.id))
    .where(eq(workspaces.id, workspaceId));
  if (!header) throw new DomainError("Espaço de estudo não encontrado.");
  const planId = header.plan.id;
  const subjectRows = await db
    .select()
    .from(subjects)
    .where(eq(subjects.planId, planId))
    .orderBy(asc(subjects.position), asc(subjects.id));
  const topicRows = await db
    .select({ row: topics })
    .from(topics)
    .innerJoin(subjects, eq(topics.subjectId, subjects.id))
    .where(eq(subjects.planId, planId))
    .orderBy(asc(topics.position), asc(topics.id));
  const sessionRows = await db
    .select({ row: studySessions, subjectId: topics.subjectId })
    .from(studySessions)
    .innerJoin(topics, eq(studySessions.topicId, topics.id))
    .innerJoin(subjects, eq(topics.subjectId, subjects.id))
    .where(eq(subjects.planId, planId))
    .orderBy(
      asc(studySessions.position),
      asc(studySessions.createdAt),
      asc(studySessions.id),
    );
  const reviewRows = await db
    .select({ row: reviews, subjectId: topics.subjectId })
    .from(reviews)
    .innerJoin(topics, eq(reviews.topicId, topics.id))
    .innerJoin(subjects, eq(topics.subjectId, subjects.id))
    .where(eq(subjects.planId, planId))
    .orderBy(asc(reviews.position), asc(reviews.createdAt), asc(reviews.id));
  const errorRows = await db
    .select({ row: errorEntries, reason: errorReasons.label })
    .from(errorEntries)
    .innerJoin(errorReasons, eq(errorEntries.reasonId, errorReasons.id))
    .innerJoin(subjects, eq(errorEntries.subjectId, subjects.id))
    .where(eq(subjects.planId, planId))
    .orderBy(asc(errorEntries.position), asc(errorEntries.id));
  const reminderRows = await db
    .select({ row: reminders })
    .from(reminders)
    .innerJoin(subjects, eq(reminders.subjectId, subjects.id))
    .where(eq(subjects.planId, planId))
    .orderBy(asc(reminders.position), asc(reminders.id));
  const bySubject = new Map<string, State["subjects"][number]["topics"]>();
  for (const { row: t } of topicRows) {
    const list = bySubject.get(t.subjectId) ?? [];
    list.push({
      id: t.id,
      name: t.name,
      read: t.read,
      mastered: t.mastered,
      kind: t.kind,
    });
    bySubject.set(t.subjectId, list);
  }
  const contestRows = includeContests
    ? await db
        .select()
        .from(contests)
        .where(eq(contests.planId, planId))
        .orderBy(asc(contests.createdAt), asc(contests.id))
    : [];
  const links = includeContests
    ? await db
        .select({ row: contestSubjects })
        .from(contestSubjects)
        .innerJoin(contests, eq(contestSubjects.contestId, contests.id))
        .where(eq(contests.planId, planId))
        .orderBy(asc(contestSubjects.subjectId))
    : [];
  const selections = includeContests
    ? await db
        .select({ row: contestTopics })
        .from(contestTopics)
        .innerJoin(contests, eq(contestTopics.contestId, contests.id))
        .where(eq(contests.planId, planId))
        .orderBy(asc(contestTopics.topicId))
    : [];
  return {
    version: header.version,
    data: {
      ...(includeContests
        ? {
            contests: contestRows.map((c) => ({
              id: c.id,
              name: c.name,
              role: c.role,
              vacancies: c.vacancies,
              salary: c.salary,
              educationLevel: c.educationLevel ?? "",
              examDate: c.examDate ?? "",
              archived: c.archived,
              subjects: links
                .filter((l) => l.row.contestId === c.id)
                .map(({ row: l }) => ({
                  subjectId: l.subjectId,
                  weight: l.weight,
                  allTopics: l.allTopics,
                  topicIds: selections
                    .filter(
                      (t) =>
                        t.row.contestId === c.id &&
                        t.row.subjectId === l.subjectId,
                    )
                    .map((t) => t.row.topicId),
                })),
            })),
          }
        : {}),
      profile: {
        name: header.name,
        target: header.plan.target,
        examDate: header.plan.examDate ?? "",
        startDate: header.plan.startDate,
        hours: header.plan.dailyHours,
        configured: header.plan.configured,
      },
      subjects: subjectRows.map((s) => ({
        id: s.id,
        name: s.name,
        domain: s.domain,
        ...(s.materialUrl !== null ? { materialUrl: s.materialUrl } : {}),
        topics: [...(bySubject.get(s.id) ?? [])].sort(
          (a, b) =>
            Number(a.kind === "eve_review") - Number(b.kind === "eve_review"),
        ),
      })),
      sessions: sessionRows.map(({ row: s, subjectId }) => ({
        id: s.id,
        topicId: s.topicId,
        subjectId,
        date: s.date,
        minutes: s.minutes,
        recall: s.recall,
        questions: s.questions,
        correct: s.correct,
        kind: s.kind,
      })),
      reviews: reviewRows.map(({ row: r, subjectId }) => ({
        id: r.id,
        topicId: r.topicId,
        subjectId,
        due: r.due,
        interval: r.interval,
        done: r.done,
      })),
      errors: errorRows.map(({ row: e, reason }) => ({
        id: e.id,
        subjectId: e.subjectId,
        topic: e.topic,
        reason,
        rule: e.rule,
        source: e.source,
        resolved: e.resolved,
        date: e.date,
      })),
      reminders: reminderRows.map(({ row: r }) => ({
        id: r.id,
        subjectId: r.subjectId,
        text: r.text,
        kind: r.kind,
        streak: r.streak,
        marked: r.streak < 3,
      })),
    },
  };
}
export async function reasonId(db: Executor, label: string) {
  await db.insert(errorReasons).values({ label }).onConflictDoNothing();
  return (
    await db
      .select({ id: errorReasons.id })
      .from(errorReasons)
      .where(eq(errorReasons.label, label))
  )[0]!.id;
}
// Used only by the one-time legacy migration, never by a normal command.
export async function importLegacyWorkspace(
  tx: Transaction,
  id: number,
  version: number,
  s: State,
) {
  await tx.insert(workspaces).values({ id, version });
  await tx.insert(profiles).values({ workspaceId: id, name: s.profile.name });
  const [plan] = await tx.execute<{ id: string }>(sql`
    insert into study_plans(
      workspace_id, target, exam_date, start_date, weekly_hours, configured
    ) values (
      ${id}, ${s.profile.target}, ${s.profile.examDate || null},
      ${s.profile.startDate}, ${s.profile.hours}, ${s.profile.configured}
    ) returning id
  `);
  for (const [position, sub] of s.subjects.entries()) {
    await tx.execute(sql`
      insert into subjects(id, plan_id, name, weight, material_url, position)
      values (
        ${sub.id},
        ${plan!.id},
        ${sub.name},
        ${(sub as typeof sub & { weight?: number }).weight ?? 1},
        ${sub.materialUrl ?? null},
        ${position}
      )
    `);
    if (sub.topics.length)
      for (const [topicPosition, topic] of sub.topics.entries())
        await tx.execute(sql`
          insert into topics(
            id, subject_id, name, is_read, is_mastered, position
          )
          values (
            ${topic.id},
            ${sub.id},
            ${topic.name},
            ${topic.read},
            ${topic.mastered},
            ${topicPosition}
          )
        `);
  }
  for (const [position, sess] of s.sessions.entries()) {
    const { subjectId, ...row } = sess;
    if (
      !s.subjects
        .find((sub) => sub.id === subjectId)
        ?.topics.some((t) => t.id === row.topicId)
    )
      throw new Error("Sessão legada com matéria/tópico incompatíveis.");
    await tx.insert(studySessions).values({ ...row, position });
  }
  for (const [position, review] of s.reviews.entries()) {
    const { subjectId, ...row } = review;
    if (
      !s.subjects
        .find((sub) => sub.id === subjectId)
        ?.topics.some((t) => t.id === row.topicId)
    )
      throw new Error("Revisão legada com matéria/tópico incompatíveis.");
    await tx.insert(reviews).values({ ...row, position });
  }
  for (const [position, error] of s.errors.entries()) {
    const { reason, ...row } = error;
    await tx
      .insert(errorEntries)
      .values({ ...row, reasonId: await reasonId(tx, reason), position });
  }
  for (const [position, reminder] of s.reminders.entries()) {
    const { marked, ...row } = reminder;
    if (marked !== row.streak < 3)
      throw new Error(
        "Lembrete legado com prioridade incompatível com a sequência.",
      );
    await tx.insert(reminders).values({ ...row, position });
  }
}

export async function executeRelationalCommand(
  db: Database,
  version: number,
  c: Command,
  workspaceId = 1,
) {
  return db.transaction(async (tx) => {
    // Serializes commands for this workspace; all writes and the revision commit atomically.
    const [workspace] = await tx
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .for("update");
    if (!workspace || workspace.version !== version)
      throw new ConflictError(
        "Os dados mudaram em outra janela. Atualize e tente novamente.",
      );
    const [plan] = await tx
      .select()
      .from(studyPlans)
      .where(eq(studyPlans.workspaceId, workspaceId));
    if (!plan) throw new DomainError("Plano não encontrado.");
    const getSubject = async (id: string) => {
      const [sub] = await tx
        .select()
        .from(subjects)
        .where(and(eq(subjects.id, id), eq(subjects.planId, plan.id)));
      if (!sub) throw new DomainError("Matéria não encontrada.");
      return sub;
    };
    const getTopic = async (id: string, subjectId: string) => {
      await getSubject(subjectId);
      const [topic] = await tx
        .select()
        .from(topics)
        .where(and(eq(topics.id, id), eq(topics.subjectId, subjectId)));
      if (!topic) throw new DomainError("Tópico não encontrado.");
      return topic;
    };
    switch (c.type) {
      case "contest": {
        const data = c.contest;
        const [existing] = await tx
          .select()
          .from(contests)
          .where(eq(contests.id, data.id));
        if (existing && existing.planId !== plan.id)
          throw new DomainError("Concurso não encontrado.");
        if (
          new Set(data.subjects.map((s) => s.subjectId)).size !==
          data.subjects.length
        )
          throw new DomainError("Matéria repetida no edital.");
        for (const link of data.subjects) {
          await getSubject(link.subjectId);
          if (link.allTopics && link.topicIds.length)
            throw new DomainError(
              "Selecione todos os tópicos ou uma lista específica.",
            );
          if (!link.allTopics && !link.topicIds.length)
            throw new DomainError("Selecione pelo menos um tópico.");
          if (new Set(link.topicIds).size !== link.topicIds.length)
            throw new DomainError("Tópico repetido.");
          for (const id of link.topicIds) await getTopic(id, link.subjectId);
        }
        await tx
          .insert(contests)
          .values({
            id: data.id,
            planId: plan.id,
            name: data.name,
            role: data.role,
            vacancies: data.vacancies,
            salary: data.salary,
            educationLevel: data.educationLevel || null,
            examDate: data.examDate || null,
            archived: data.archived,
          })
          .onConflictDoUpdate({
            target: contests.id,
            set: {
              name: data.name,
              role: data.role,
              vacancies: data.vacancies,
              salary: data.salary,
              educationLevel: data.educationLevel || null,
              examDate: data.examDate || null,
              archived: data.archived,
            },
          });
        await tx
          .delete(contestSubjects)
          .where(eq(contestSubjects.contestId, data.id));
        for (const link of data.subjects) {
          await tx.insert(contestSubjects).values({
            contestId: data.id,
            subjectId: link.subjectId,
            weight: link.weight,
            allTopics: link.allTopics,
          });
          if (link.topicIds.length)
            await tx.insert(contestTopics).values(
              link.topicIds.map((topicId) => ({
                contestId: data.id,
                subjectId: link.subjectId,
                topicId,
              })),
            );
        }
        break;
      }
      case "profile": {
        await tx
          .update(profiles)
          .set({ name: c.profile.name })
          .where(eq(profiles.workspaceId, workspaceId));
        await tx
          .update(studyPlans)
          .set({
            target: c.profile.target,
            examDate: c.profile.examDate || null,
            startDate: c.profile.startDate,
            dailyHours: c.profile.hours,
            configured: c.profile.configured,
          })
          .where(eq(studyPlans.id, plan.id));
        break;
      }
      case "subject": {
        const [subject] = await tx
          .insert(subjects)
          .values({ planId: plan.id, name: c.name })
          .returning({ id: subjects.id });
        await tx.insert(topics).values({
          subjectId: subject!.id,
          name: "Revisão de Véspera",
          kind: "eve_review",
        });
        break;
      }
      case "domain":
        await getSubject(c.id);
        await tx
          .update(subjects)
          .set({ domain: c.domain })
          .where(eq(subjects.id, c.id));
        break;
      case "editSubject":
        await getSubject(c.id);
        await tx
          .update(subjects)
          .set({ name: c.name, materialUrl: c.materialUrl })
          .where(eq(subjects.id, c.id));
        break;
      case "deleteSubject":
        await getSubject(c.id);
        await tx.delete(subjects).where(eq(subjects.id, c.id));
        break;
      case "topic": {
        await getSubject(c.subjectId);
        if (c.name.trim().toLocaleLowerCase() === "revisão de véspera")
          throw new DomainError("A Revisão de Véspera já existe na matéria.");
        await tx
          .insert(topics)
          .values({ subjectId: c.subjectId, name: c.name });
        break;
      }
      case "topics": {
        await getSubject(c.subjectId);
        if (
          c.names.some(
            (name) => name.trim().toLocaleLowerCase() === "revisão de véspera",
          )
        )
          throw new DomainError("A Revisão de Véspera já existe na matéria.");
        await tx
          .insert(topics)
          .values(c.names.map((name) => ({ subjectId: c.subjectId, name })));
        break;
      }
      case "reorderTopics": {
        await getSubject(c.subjectId);
        const current = await tx
          .select({ id: topics.id })
          .from(topics)
          .where(eq(topics.subjectId, c.subjectId));
        const currentIds = new Set(current.map((topic) => topic.id));
        if (
          c.topicIds.length !== current.length ||
          new Set(c.topicIds).size !== c.topicIds.length ||
          c.topicIds.some((id) => !currentIds.has(id))
        )
          throw new DomainError("A lista de tópicos está desatualizada.");
        for (const [position, id] of c.topicIds.entries())
          await tx
            .update(topics)
            .set({ position })
            .where(and(eq(topics.id, id), eq(topics.subjectId, c.subjectId)));
        break;
      }
      case "editTopic": {
        const topic = await getTopic(c.id, c.subjectId);
        if (topic.kind === "eve_review")
          throw new DomainError("A Revisão de Véspera não pode ser editada.");
        await tx
          .update(topics)
          .set({ name: c.name })
          .where(eq(topics.id, c.id));
        break;
      }
      case "deleteTopic": {
        const topic = await getTopic(c.id, c.subjectId);
        if (topic.kind === "eve_review")
          throw new DomainError("A Revisão de Véspera não pode ser excluída.");
        await tx
          .delete(topics)
          .where(and(eq(topics.id, c.id), eq(topics.subjectId, c.subjectId)));
        const remaining = await tx
          .select({ id: topics.id })
          .from(topics)
          .where(eq(topics.subjectId, c.subjectId))
          .orderBy(asc(topics.position), asc(topics.id));
        for (const [position, topic] of remaining.entries())
          await tx
            .update(topics)
            .set({ position })
            .where(eq(topics.id, topic.id));
        break;
      }
      case "session": {
        const session = c.session;
        await getTopic(session.topicId, session.subjectId);
        const [existing] = await tx
          .select()
          .from(studySessions)
          .where(eq(studySessions.id, session.id));
        if (existing) {
          if (existing.topicId !== session.topicId)
            throw new DomainError("Identificador de sessão já utilizado.");
          break;
        }
        validateSession(session);
        const { subjectId: ignoredSubjectId, ...row } = session;
        void ignoredSubjectId;
        await tx.insert(studySessions).values({ ...row, date: today() });
        if (session.kind === "reading")
          await tx
            .update(topics)
            .set({ read: true })
            .where(eq(topics.id, session.topicId));
        if (session.kind === "active") {
          const pending = await tx
            .select({ interval: reviews.interval })
            .from(reviews)
            .where(
              and(
                eq(reviews.topicId, session.topicId),
                eq(reviews.done, false),
              ),
            );

          for (const interval of [1, 7, 30])
            if (!pending.some((r) => r.interval === interval))
              await tx.insert(reviews).values({
                topicId: session.topicId,
                due: addDays(today(), interval),
                interval,
              });
        }
        break;
      }
      case "review": {
        const [entry] = await tx
          .select({ review: reviews, subjectId: topics.subjectId })
          .from(reviews)
          .innerJoin(topics, eq(reviews.topicId, topics.id))
          .innerJoin(subjects, eq(topics.subjectId, subjects.id))
          .where(and(eq(reviews.id, c.id), eq(subjects.planId, plan.id)));
        if (!entry || entry.review.done)
          throw new DomainError("Revisão indisponível.");
        validateReview(entry.review.interval, c.questions, c.correct);
        await tx
          .update(reviews)
          .set({ done: true })
          .where(eq(reviews.id, c.id));
        if (c.questions)
          await tx.insert(studySessions).values({
            topicId: entry.review.topicId,
            date: today(),
            minutes: entry.review.interval === 30 ? 20 : 10,
            recall: "Revisão concluída",
            questions: c.questions,
            correct: c.correct,
            kind: "active",
          });
        break;
      }
      case "error": {
        await getSubject(c.error.subjectId);
        const { reason, ...row } = c.error;
        await tx.insert(errorEntries).values({
          ...row,
          reasonId: await reasonId(tx, reason),
          date: today(),
        });
        break;
      }
      case "resolve": {
        const [entry] = await tx
          .select({ id: errorEntries.id })
          .from(errorEntries)
          .innerJoin(subjects, eq(errorEntries.subjectId, subjects.id))
          .where(and(eq(errorEntries.id, c.id), eq(subjects.planId, plan.id)));
        if (!entry) throw new DomainError("Erro não encontrado.");
        await tx
          .update(errorEntries)
          .set({ resolved: sql`not ${errorEntries.resolved}` })
          .where(eq(errorEntries.id, c.id));
        break;
      }
      case "reminder": {
        await getSubject(c.reminder.subjectId);
        if (c.reminder.marked !== c.reminder.streak < 3)
          throw new DomainError(
            "Prioridade incompatível com a sequência de revisões.",
          );
        const { marked: ignoredMarked, ...row } = c.reminder;
        void ignoredMarked;
        await tx.insert(reminders).values({ ...row });
        break;
      }
      case "remember": {
        const [entry] = await tx
          .select({ id: reminders.id })
          .from(reminders)
          .innerJoin(subjects, eq(reminders.subjectId, subjects.id))
          .where(and(eq(reminders.id, c.id), eq(subjects.planId, plan.id)));
        if (!entry) throw new DomainError("Lembrete não encontrado.");
        await tx
          .update(reminders)
          .set({ streak: c.known ? sql`${reminders.streak} + 1` : 0 })
          .where(eq(reminders.id, c.id));
        break;
      }
    }
    await tx
      .update(workspaces)
      .set({ version: sql`${workspaces.version} + 1` })
      .where(eq(workspaces.id, workspaceId));
    return readWorkspace(tx, workspaceId);
  });
}
