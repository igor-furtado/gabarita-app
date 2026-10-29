import type { Contest, State } from "./schemas.js";

export function activeContests(s: State, date: string) {
  return (s.contests ?? [])
    .filter((c) => !c.archived && (!c.examDate || c.examDate >= date))
    .sort(
      (a, b) =>
        (a.examDate || "9999").localeCompare(b.examDate || "9999") ||
        a.name.localeCompare(b.name),
    );
}

export function examGroups(s: State, date: string) {
  const groups: Array<{
    date: string | null;
    contests: Contest[];
  }> = [];
  for (const contest of activeContests(s, date)) {
    if (!contest.examDate) {
      const undated = groups.find((group) => group.date === null);
      if (undated) undated.contests.push(contest);
      else groups.push({ date: null, contests: [contest] });
      continue;
    }
    const current = groups.at(-1);
    const distance = current?.date
      ? Math.floor(
          (Date.parse(contest.examDate) - Date.parse(current.date)) / 86400000,
        )
      : Number.POSITIVE_INFINITY;
    if (current?.date && distance <= 6) current.contests.push(contest);
    else groups.push({ date: contest.examDate, contests: [contest] });
  }
  return groups;
}

export type PreparationScenario =
  "urgent" | "short" | "standard" | "long" | "undated";

function scenarioKind(
  daysRemaining: number,
): Exclude<PreparationScenario, "undated"> {
  return daysRemaining <= 30
    ? "urgent"
    : daysRemaining <= 59
      ? "short"
      : daysRemaining <= 120
        ? "standard"
        : "long";
}

export function scenario(s: State, date: string) {
  const first = examGroups(s, date)[0];
  if (!first?.date) return { kind: "undated" as const, daysRemaining: null };
  const daysRemaining = Math.ceil(
    (Date.parse(first.date) - Date.parse(date)) / 86400000,
  );
  const kind = scenarioKind(daysRemaining);
  return { kind, daysRemaining };
}

export function rankedSubjects(s: State, date: string) {
  const contests = activeContests(s, date);
  const groups = examGroups(s, date);
  return s.subjects
    .flatMap((subject) => {
      const matches = contests.filter((contest) =>
        contest.subjects.some((link) => link.subjectId === subject.id),
      );
      if (!matches.length) return [];
      const groupIndex = groups.findIndex((group) =>
        group.contests.some((contest) =>
          contest.subjects.some((link) => link.subjectId === subject.id),
        ),
      );
      const group = groups[groupIndex]!;
      const weights = group.contests.flatMap((contest) =>
        contest.subjects
          .filter((link) => link.subjectId === subject.id)
          .map((link) => link.weight),
      );
      return [
        {
          subject,
          groupIndex,
          groupDate: group.date,
          weight: Math.max(...weights),
          domain:
            (subject as typeof subject & { domain?: number | null }).domain ??
            null,
          recurrence: matches.length,
        },
      ];
    })
    .sort(
      (a, b) =>
        a.groupIndex - b.groupIndex ||
        b.weight - a.weight ||
        (a.domain ?? Number.POSITIVE_INFINITY) -
          (b.domain ?? Number.POSITIVE_INFINITY) ||
        b.recurrence - a.recurrence ||
        a.subject.name.localeCompare(b.subject.name, "pt-BR"),
    );
}

export function subjectLimit(s: State) {
  const weeklyHours = s.profile.hours * 6;
  return weeklyHours < 10 ? 6 : weeklyHours < 14 ? 10 : s.subjects.length;
}

export function planReadiness(s: State, date: string) {
  const contests = activeContests(s, date).filter(
    (contest) => contest.subjects.length > 0,
  );
  const subjectIds = new Set(
    contests.flatMap((contest) =>
      contest.subjects.map((subject) => subject.subjectId),
    ),
  );
  const missingDomains = s.subjects
    .filter((subject) => subjectIds.has(subject.id) && subject.domain === null)
    .map((subject) => subject.id);
  const needsProfile = !s.profile.configured;
  const needsContest = contests.length === 0;
  return {
    ready: !needsProfile && !needsContest && missingDomains.length === 0,
    needsProfile,
    needsContest,
    missingDomains,
  };
}

type PlanPhaseKind =
  | "base"
  | "foundation"
  | "consolidation"
  | "final"
  | "eve_review"
  | "legislation"
  | "judgments"
  | "mock";

function standardPhases(days: number) {
  const foundation = Math.round((days * 6) / 13);
  const consolidation = Math.round((days * 5) / 13);
  return [
    { kind: "foundation" as const, days: foundation },
    { kind: "consolidation" as const, days: consolidation },
    {
      kind: "final" as const,
      days: days - foundation - consolidation,
    },
  ];
}

const urgentPhases = [
  { kind: "eve_review" as const, days: null },
  { kind: "legislation" as const, days: null },
  { kind: "judgments" as const, days: null },
  { kind: "mock" as const, days: null },
];

export function planOutline(
  s: State,
  date: string,
): {
  scenario: PreparationScenario;
  daysRemaining: number | null;
  phases: Array<{ kind: PlanPhaseKind; days: number | null }>;
} {
  const current = scenario(s, date);
  if (current.kind === "undated")
    return {
      scenario: current.kind,
      daysRemaining: null,
      phases: [{ kind: "foundation", days: null }],
    };
  const examDate = examGroups(s, date)[0]!.date!;
  const initialDays = Math.ceil(
    (Date.parse(examDate) - Date.parse(s.profile.startDate)) / 86400000,
  );
  const route = scenarioKind(initialDays);
  if (route === "urgent")
    return {
      scenario: current.kind,
      daysRemaining: current.daysRemaining,
      phases: urgentPhases,
    };
  const daysBeforeUrgency = Math.max(1, initialDays - 30);
  if (route === "short") {
    const foundation = Math.round((daysBeforeUrgency * 2) / 3);
    return {
      scenario: current.kind,
      daysRemaining: current.daysRemaining,
      phases: [
        { kind: "foundation", days: foundation },
        { kind: "final", days: daysBeforeUrgency - foundation },
        ...urgentPhases,
      ],
    };
  }
  const baseDays = route === "long" ? Math.max(0, daysBeforeUrgency - 90) : 0;
  const corePhases = standardPhases(daysBeforeUrgency - baseDays);
  if (route === "standard")
    return {
      scenario: current.kind,
      daysRemaining: current.daysRemaining,
      phases: [...corePhases, ...urgentPhases],
    };
  return {
    scenario: current.kind,
    daysRemaining: current.daysRemaining,
    phases: [{ kind: "base", days: baseDays }, ...corePhases, ...urgentPhases],
  };
}

export function studyWeek(s: State, date: string) {
  const blocksPerDay = Math.max(1, Math.round(s.profile.hours * 2));
  const days: Array<{
    date: string;
    blocks: Array<{
      minutes: 30;
      role: "main" | "fitting";
      subject: State["subjects"][number];
      topic: State["subjects"][number]["topics"][number];
      sessionKind: "reading" | "active" | "mock";
      label?: string;
    }>;
  }> = [];
  const firstDay = s.profile.startDate > date ? s.profile.startDate : date;
  const examDate = examGroups(s, date)[0]?.date;
  let cursor = new Date(firstDay + "T12:00:00Z");
  while (
    days.length < 6 &&
    (!examDate || cursor.toISOString().slice(0, 10) <= examDate)
  ) {
    if (cursor.getUTCDay() !== 0) {
      const day = cursor.toISOString().slice(0, 10);
      const ranked = rankedSubjects(s, day).slice(0, subjectLimit(s));
      const dayScenario = scenario(s, day).kind;
      const urgent = dayScenario === "urgent" ? urgentStep(s, day) : null;
      const urgentReading =
        urgent?.kind === "reading"
          ? { subject: urgent.subject, topic: urgent.topic }
          : null;
      const stage = planStage(s, day);
      const finalReading =
        stage === "final"
          ? ranked
              .map((candidate) => ({
                subject: candidate.subject,
                topic: candidate.subject.topics.find(
                  (topic) => topic.kind === "eve_review" && !topic.read,
                ),
              }))
              .find(
                (
                  candidate,
                ): candidate is {
                  subject: State["subjects"][number];
                  topic: State["subjects"][number]["topics"][number];
                } => Boolean(candidate.topic),
              )
          : undefined;
      const regularMain = ranked
        .map((candidate) => ({
          subject: candidate.subject,
          topic: candidate.subject.topics.find(
            (topic) => topic.kind === "regular" && !topic.read,
          ),
        }))
        .find(
          (
            candidate,
          ): candidate is {
            subject: State["subjects"][number];
            topic: State["subjects"][number]["topics"][number];
          } => Boolean(candidate.topic),
        );
      const activeMain = ranked
        .map((candidate) => ({
          subject: candidate.subject,
          topic: candidate.subject.topics.find(
            (topic) => topic.kind === "regular",
          ),
        }))
        .find(
          (
            candidate,
          ): candidate is {
            subject: State["subjects"][number];
            topic: State["subjects"][number]["topics"][number];
          } => Boolean(candidate.topic),
        );
      const main =
        urgentReading ??
        finalReading ??
        regularMain ??
        (stage === "consolidation" || stage === "final"
          ? activeMain
          : undefined);
      const fitting =
        dayScenario === "urgent" || stage === "final"
          ? undefined
          : ranked
              .filter((candidate) => candidate.subject.id !== main?.subject.id)
              .map((candidate) => ({
                ...candidate,
                topic: candidate.subject.topics.find(
                  (topic) => topic.kind === "regular" && !topic.read,
                ),
              }))
              .filter(
                (
                  candidate,
                ): candidate is typeof candidate & {
                  topic: State["subjects"][number]["topics"][number];
                } => Boolean(candidate.topic),
              )
              .sort(
                (a, b) =>
                  (b.domain ?? Number.NEGATIVE_INFINITY) -
                    (a.domain ?? Number.NEGATIVE_INFINITY) ||
                  a.weight - b.weight ||
                  a.subject.name.localeCompare(b.subject.name, "pt-BR"),
              )[0];
      const blocks = [];
      if (urgent?.kind === "mock") {
        if (activeMain)
          blocks.push({
            minutes: 30 as const,
            role: "main" as const,
            subject: activeMain.subject,
            topic: activeMain.topic,
            sessionKind: "mock" as const,
            label: "Simulado completo",
          });
      } else if (urgent?.kind !== "organize") {
        for (let index = 0; index < blocksPerDay; index++) {
          const useFitting = Boolean(fitting && index === blocksPerDay - 1);
          const selected = useFitting ? fitting : main;
          if (!selected) break;
          blocks.push({
            minutes: 30 as const,
            role: useFitting ? ("fitting" as const) : ("main" as const),
            subject: selected.subject,
            topic: selected.topic,
            sessionKind:
              !selected.topic.read || urgentReading
                ? ("reading" as const)
                : ("active" as const),
          });
        }
      }
      days.push({ date: day, blocks });
    }
    cursor = new Date(cursor.getTime() + 86400000);
  }
  return days;
}

export function planStage(s: State, date: string): PlanPhaseKind {
  const current = scenario(s, date);
  if (current.kind === "urgent") {
    const step = urgentStep(s, date);
    if (step.kind === "mock") return "mock";
    if (
      step.kind === "reading" &&
      /alterações legislativas/i.test(step.subject.name)
    )
      return "legislation";
    if (step.kind === "reading" && /julgados/i.test(step.subject.name))
      return "judgments";
    return "eve_review";
  }
  if (current.kind === "undated") return "foundation";
  const examDate = examGroups(s, date)[0]!.date!;
  const start = s.profile.startDate;
  const initialDays = Math.ceil(
    (Date.parse(examDate) - Date.parse(start)) / 86400000,
  );
  const route = scenarioKind(initialDays);
  if (route === "urgent") return "eve_review";
  const totalBeforeUrgency = Math.max(1, initialDays - 30);
  const elapsed = Math.max(
    0,
    Math.floor((Date.parse(date) - Date.parse(start)) / 86400000),
  );
  if (route === "short")
    return elapsed < Math.round((totalBeforeUrgency * 2) / 3)
      ? "foundation"
      : "final";
  const baseDays = route === "long" ? Math.max(0, totalBeforeUrgency - 90) : 0;
  if (elapsed < baseDays) return "base";
  const standardElapsed = elapsed - baseDays;
  const standardDays = totalBeforeUrgency - baseDays;
  if (standardElapsed < Math.round((standardDays * 6) / 13))
    return "foundation";
  if (standardElapsed < Math.round((standardDays * 11) / 13))
    return "consolidation";
  return "final";
}

export function urgentStep(s: State, date: string) {
  const ranked = rankedSubjects(s, date).slice(0, subjectLimit(s));
  for (const candidate of ranked) {
    const topic = candidate.subject.topics.find(
      (item) => item.kind === "eve_review" && !item.read,
    );
    if (topic)
      return {
        kind: "reading" as const,
        subject: candidate.subject,
        topic,
        reason:
          "Rota urgente: comece pela Revisão de Véspera da matéria prioritária.",
      };
  }
  for (const pattern of [/alterações legislativas/i, /julgados/i]) {
    for (const candidate of ranked.filter(({ subject }) =>
      pattern.test(subject.name),
    )) {
      const links = examGroups(s, date)[candidate.groupIndex]?.contests.flatMap(
        (contest) =>
          contest.subjects.filter(
            (link) => link.subjectId === candidate.subject.id,
          ),
      );
      const allTopics = links?.some((link) => link.allTopics) ?? false;
      const selectedIds = new Set(links?.flatMap((link) => link.topicIds));
      const topic = candidate.subject.topics.find(
        (item) =>
          item.kind === "regular" &&
          !item.read &&
          (allTopics || selectedIds.has(item.id)),
      );
      if (topic)
        return {
          kind: "reading" as const,
          subject: candidate.subject,
          topic,
          reason:
            pattern.source === "julgados"
              ? "Rota urgente: avance pelos julgados pertinentes ao edital."
              : "Rota urgente: avance pelas alterações legislativas pertinentes ao edital.",
        };
    }
  }
  const examDate = examGroups(s, date)[0]?.date;
  const urgentStart = examDate
    ? new Date(Date.parse(examDate) - 30 * 86400000).toISOString().slice(0, 10)
    : date;
  if (
    s.sessions.some(
      (session) =>
        session.kind === "mock" &&
        session.date >= urgentStart &&
        session.date <= date,
    )
  )
    return {
      kind: "organize" as const,
      reason:
        "A rota urgente e o simulado foram concluídos. Corrija os erros e ajuste os próximos blocos conforme a necessidade.",
    };
  return {
    kind: "mock" as const,
    reason:
      "Rota urgente concluída até o simulado. Resolva uma prova completa e corrija os erros.",
  };
}
export function contestTopics(s: State, contest: Contest) {
  return contest.subjects.flatMap((link) => {
    const subject = s.subjects.find((x) => x.id === link.subjectId);
    return (
      subject?.topics
        .filter((topic) => topic.kind === "regular")
        .filter((t) => link.allTopics || link.topicIds.includes(t.id))
        .map((topic) => ({ subject, topic, weight: link.weight })) ?? []
    );
  });
}
export function contestProgress(s: State, contest: Contest) {
  const topics = contestTopics(s, contest);
  return {
    total: topics.length,
    read: topics.filter((x) => x.topic.read).length,
  };
}
export function relevantTopics(s: State, subjectId: string, date: string) {
  const subject = s.subjects.find((x) => x.id === subjectId);
  void date;
  return subject?.topics.filter((topic) => topic.kind === "regular") ?? [];
}

// Urgency is the first ordering key. Weight and reuse decide within the same exam date.
export function rankedCandidates(s: State, date: string) {
  const contests = activeContests(s, date);
  return rankedSubjects(s, date).flatMap((ranked) => {
    const matches = contests.flatMap((contest) => {
      const link = contest.subjects.find(
        (candidate) => candidate.subjectId === ranked.subject.id,
      );
      return link ? [{ contest, weight: link.weight }] : [];
    });
    return ranked.subject.topics
      .filter((topic) => topic.kind === "regular")
      .map((topic) => ({
        subject: ranked.subject,
        topic,
        matches,
        urgentDate: ranked.groupDate ?? "9999",
        weight: ranked.weight,
        score: ranked.weight,
      }));
  });
}
export function explainCandidate(
  candidate: ReturnType<typeof rankedCandidates>[number],
) {
  const primary = candidate.matches[0]!.contest;
  const date = primary.examDate
    ? `prova em ${primary.examDate.split("-").reverse().join("/")}`
    : "data ainda não definida";
  const others = candidate.matches.slice(1).map((m) => m.contest.name);
  return `${primary.name}: ${date}, peso ${candidate.weight}. ${others.length ? `Este tópico também conta para ${others.join(", ")}.` : "Conteúdo específico deste edital."}`;
}
