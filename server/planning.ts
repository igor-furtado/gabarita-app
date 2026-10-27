import type { Contest, State } from "./domain.js";

export function activeContests(s: State, date: string) {
  return (s.contests ?? [])
    .filter((c) => !c.archived && (!c.examDate || c.examDate >= date))
    .sort(
      (a, b) =>
        (a.examDate || "9999").localeCompare(b.examDate || "9999") ||
        a.name.localeCompare(b.name),
    );
}
export function contestTopics(s: State, contest: Contest) {
  return contest.subjects.flatMap((link) => {
    const subject = s.subjects.find((x) => x.id === link.subjectId);
    return (
      subject?.topics
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
    mastered: topics.filter((x) => x.topic.mastered).length,
  };
}
export function relevantTopics(s: State, subjectId: string, date: string) {
  const subject = s.subjects.find((x) => x.id === subjectId);
  if (!s.contests?.length) return subject?.topics ?? [];
  const ids = new Set(
    activeContests(s, date)
      .flatMap((c) => contestTopics(s, c))
      .filter((x) => x.subject.id === subjectId)
      .map((x) => x.topic.id),
  );
  return subject?.topics.filter((t) => ids.has(t.id)) ?? [];
}

// Urgency is the first ordering key. Weight and reuse decide within the same exam date.
export function rankedCandidates(s: State, date: string) {
  const contests = activeContests(s, date);
  const last = s.sessions.at(-1)?.subjectId;
  const candidates = s.subjects.flatMap((subject) =>
    subject.topics.flatMap((topic) => {
      const matches = contests.flatMap((contest) => {
        const link = contest.subjects.find(
          (l) =>
            l.subjectId === subject.id &&
            (l.allTopics || l.topicIds.includes(topic.id)),
        );
        return link ? [{ contest, weight: link.weight }] : [];
      });
      if (!matches.length) return [];
      const urgentDate = matches[0]!.contest.examDate || "9999";
      const weight = Math.max(
        ...matches
          .filter((m) => (m.contest.examDate || "9999") === urgentDate)
          .map((m) => m.weight),
      );
      const score =
        weight +
        Math.min(2, (matches.length - 1) * 0.5) -
        (last === subject.id ? 0.25 : 0);
      return [{ subject, topic, matches, urgentDate, weight, score }];
    }),
  );
  return candidates.sort(
    (a, b) =>
      a.urgentDate.localeCompare(b.urgentDate) ||
      b.score - a.score ||
      a.subject.name.localeCompare(b.subject.name),
  );
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
