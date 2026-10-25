import { and, eq, sql, asc } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
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
      .values({ workspaceId, startDate: today() })
      .returning();
    await tx
      .insert(subjects)
      .values(
        names.map((name, position) => ({
          planId: plan!.id,
          name,
          weight: position < 5 ? 3 : 1,
        })),
      );
  });
}

// This DTO is assembled for API compatibility. No document is stored in PostgreSQL.
export async function readWorkspace(
  db: Executor,
  workspaceId = 1,
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
    list.push({ id: t.id, name: t.name, read: t.read, mastered: t.mastered });
    bySubject.set(t.subjectId, list);
  }
  return {
    version: header.version,
    data: {
      profile: {
        name: header.name,
        target: header.plan.target,
        examDate: header.plan.examDate ?? "",
        startDate: header.plan.startDate,
        hours: header.plan.weeklyHours,
        configured: header.plan.configured,
      },
      subjects: subjectRows.map((s) => ({
        id: s.id,
        name: s.name,
        weight: s.weight,
        ...(s.materialUrl !== null ? { materialUrl: s.materialUrl } : {}),
        topics: bySubject.get(s.id) ?? [],
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
  const [plan] = await tx
    .insert(studyPlans)
    .values({
      workspaceId: id,
      target: s.profile.target,
      examDate: s.profile.examDate || null,
      startDate: s.profile.startDate,
      weeklyHours: s.profile.hours,
      configured: s.profile.configured,
    })
    .returning();
  for (const [position, sub] of s.subjects.entries()) {
    await tx
      .insert(subjects)
      .values({
        id: sub.id,
        planId: plan!.id,
        name: sub.name,
        weight: sub.weight,
        materialUrl: sub.materialUrl ?? null,
        position,
      });
    if (sub.topics.length)
      await tx
        .insert(topics)
        .values(
          sub.topics.map((t, position) => ({
            ...t,
            subjectId: sub.id,
            position,
          })),
        );
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
            weeklyHours: c.profile.hours,
            configured: c.profile.configured,
          })
          .where(eq(studyPlans.id, plan.id));
        break;
      }
      case "subject": {
        await tx
          .insert(subjects)
          .values({ planId: plan.id, name: c.name, weight: c.weight });
        break;
      }
      case "weight":
        await getSubject(c.id);
        await tx
          .update(subjects)
          .set({ weight: c.weight })
          .where(eq(subjects.id, c.id));
        break;
      case "editSubject":
        await getSubject(c.id);
        await tx
          .update(subjects)
          .set({ name: c.name, materialUrl: c.materialUrl })
          .where(eq(subjects.id, c.id));
        break;
      case "topic": {
        await getSubject(c.subjectId);
        await tx
          .insert(topics)
          .values({ subjectId: c.subjectId, name: c.name });
        break;
      }
      case "editTopic":
        await getTopic(c.id, c.subjectId);
        await tx
          .update(topics)
          .set({ name: c.name })
          .where(eq(topics.id, c.id));
        break;
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
        const unread = await tx
          .select({ id: topics.id })
          .from(topics)
          .where(
            and(
              eq(topics.subjectId, session.subjectId),
              eq(topics.read, false),
            ),
          )
          .limit(1);
        validateSession(session, unread.length === 0);
        const { subjectId: ignoredSubjectId, ...row } = session;
        void ignoredSubjectId;
        await tx.insert(studySessions).values({ ...row, date: today() });
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
              await tx
                .insert(reviews)
                .values({
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
        if (entry.review.interval === 30) {
          const mastered = c.correct / c.questions > 0.8;
          await tx
            .update(topics)
            .set({ mastered })
            .where(eq(topics.id, entry.review.topicId));
          if (!mastered)
            await tx
              .insert(reviews)
              .values({
                topicId: entry.review.topicId,
                interval: 30,
                due: addDays(today(), 7),
              });
        }
        if (c.questions)
          await tx
            .insert(studySessions)
            .values({
              topicId: entry.review.topicId,
              date: today(),
              minutes: entry.review.interval === 30 ? 20 : 10,
              recall: "Revisão concluída",
              questions: c.questions,
              correct: c.correct,
              kind: "mock",
            });
        break;
      }
      case "error": {
        await getSubject(c.error.subjectId);
        const { reason, ...row } = c.error;
        await tx
          .insert(errorEntries)
          .values({
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
