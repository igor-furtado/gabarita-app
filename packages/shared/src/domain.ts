import type { Session, State } from "./schemas.js";
import {
  activeContests,
  rankedCandidates,
  relevantTopics,
  explainCandidate,
  scenario,
  urgentStep,
} from "./planning.js";
export const names = [
  "Direito Administrativo",
  "Direito Constitucional",
  "Contabilidade Geral e Avançada",
  "Direito Tributário",
  "Legislação Tributária",
  "Língua Portuguesa",
  "Matemática",
  "Auditoria",
  "Controle Externo",
  "Direito Financeiro e Contabilidade Pública",
  "Administração Pública",
  "Economia e Finanças Públicas",
  "Direito Penal — Parte Geral",
  "Direito Penal — Parte Especial",
  "Direito Civil",
  "Tecnologia da Informação",
];
export function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Fortaleza",
  }).format(new Date());
}
export function addDays(date: string, days: number) {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export function initialState(): State {
  return {
    profile: {
      name: "",
      target: "",
      examDate: "",
      startDate: today(),
      hours: 2,
      configured: false,
    },
    subjects: names.map((name) => ({
      id: crypto.randomUUID(),
      name,
      domain: null,
      topics: [
        {
          id: crypto.randomUUID(),
          name: "Revisão de Véspera",
          read: false,
          mastered: false,
          kind: "eve_review" as const,
        },
      ],
    })),
    sessions: [],
    reviews: [],
    errors: [],
    reminders: [],
  };
}
export function phase(s: State, date = today()) {
  const elapsed = Math.max(
    0,
    Math.floor((Date.parse(date) - Date.parse(s.profile.startDate)) / 86400000),
  );
  const examDate = s.contests?.length
    ? activeContests(s, date)[0]?.examDate
    : s.profile.examDate;
  const remaining = examDate
    ? Math.ceil((Date.parse(examDate) - Date.parse(date)) / 86400000)
    : null;
  if (remaining === null) {
    const weeklyHours = s.profile.hours * 6;
    const limit = weeklyHours < 10 ? 6 : weeklyHours < 14 ? 10 : 16;
    const ids = [
      ...new Set(rankedCandidates(s, date).map((c) => c.subject.id)),
    ].slice(0, limit);
    const selected = s.contests?.length
      ? s.subjects
          .filter((sub) => ids.includes(sub.id))
          .map((sub) => ({ ...sub, topics: relevantTopics(s, sub.id, date) }))
      : [...s.subjects]
          .sort(
            (a, b) =>
              (a.domain ?? Number.POSITIVE_INFINITY) -
                (b.domain ?? Number.POSITIVE_INFINITY) ||
              a.name.localeCompare(b.name, "pt-BR"),
          )
          .slice(0, limit);
    return selected.length > 0 &&
      selected.every(
        (sub) => sub.topics.length > 0 && sub.topics.every((t) => t.read),
      )
      ? "Consolidação"
      : "Fundação";
  }
  return remaining !== null && remaining <= 30
    ? "Reta final"
    : elapsed < 42
      ? "Fundação"
      : elapsed < 77
        ? "Consolidação"
        : "Reta final";
}
export class DomainError extends Error {}
export function validateSession(session: Session) {
  if (session.correct > session.questions)
    throw new DomainError("Acertos não podem superar questões.");
}
export function validateReview(
  _interval: number,
  questions: number,
  correct: number,
) {
  if (correct > questions) throw new DomainError("Acertos inválidos.");
}

export function recommendation(s: State, date = today()) {
  if (new Date(date + "T12:00:00Z").getUTCDay() === 0)
    return {
      kind: "rest" as const,
      reason: "Domingo é reservado ao descanso na metodologia.",
    };
  if (s.contests?.length && scenario(s, date).kind === "urgent")
    return urgentStep(s, date);
  const due = s.reviews
    .filter((r) => !r.done && r.due <= date)
    .sort((a, b) => a.due.localeCompare(b.due))[0];
  if (due)
    return {
      kind: "review" as const,
      review: due,
      reason:
        "Revisão vencida ou prevista para hoje: preservar a memória vem antes de avançar no edital.",
    };
  if (s.contests?.length) {
    const candidates = rankedCandidates(s, date).filter(
      ({ subject, topic }) =>
        !topic.read ||
        (!s.sessions.some(
          (session) =>
            session.topicId === topic.id && session.kind === "active",
        ) &&
          !s.reviews.some((r) => r.topicId === topic.id && !r.done) &&
          relevantTopics(s, subject.id, date).every((t) => t.read)),
    );
    const weeklyHours = s.profile.hours * 6;
    const limit = weeklyHours < 10 ? 6 : weeklyHours < 14 ? 10 : 16;
    const subjectIds = [...new Set(candidates.map((c) => c.subject.id))].slice(
      0,
      limit,
    );
    for (const candidate of candidates.filter((c) =>
      subjectIds.includes(c.subject.id),
    )) {
      const { subject, topic } = candidate;
      if (!topic.read)
        return {
          kind: "reading" as const,
          subject,
          topic,
          reason: explainCandidate(candidate),
        };
      if (
        !s.sessions.some(
          (session) =>
            session.topicId === topic.id && session.kind === "active",
        ) &&
        !s.reviews.some((r) => r.topicId === topic.id && !r.done) &&
        relevantTopics(s, subject.id, date).every((t) => t.read)
      )
        return {
          kind: "active" as const,
          subject,
          topic,
          reason: explainCandidate(candidate),
        };
    }
    return {
      kind: "organize" as const,
      reason: activeContests(s, date).length
        ? "Os conteúdos selecionados estão em dia ou aguardando revisão. Confira os tópicos dos seus editais."
        : "Nenhum concurso ativo com prova futura. Cadastre um concurso ou atualize as datas.",
    };
  }
  const weeklyHours = s.profile.hours * 6;
  const limit = weeklyHours < 10 ? 6 : weeklyHours < 14 ? 10 : 16;
  const eligible = [...s.subjects]
    .filter((subject) => subject.domain !== null)
    .sort(
      (a, b) => a.domain! - b.domain! || a.name.localeCompare(b.name, "pt-BR"),
    )
    .slice(0, limit);
  const ordered = eligible;
  for (const subject of ordered) {
    const topic = subject.topics.find(
      (candidate) => candidate.kind === "regular" && !candidate.read,
    );
    if (topic)
      return {
        kind: "reading" as const,
        subject,
        topic,
        reason:
          "Primeira leitura, considerando o domínio informado na matéria.",
      };
  }
  for (const subject of ordered) {
    const topic = subject.topics.find(
      (t) =>
        !s.sessions.some(
          (session) => session.topicId === t.id && session.kind === "active",
        ) && !s.reviews.some((r) => r.topicId === t.id && !r.done),
    );
    if (topic)
      return {
        kind: "active" as const,
        subject,
        topic,
        reason: "Leitura concluída: avance para a recuperação ativa.",
      };
  }
  return {
    kind: "organize" as const,
    reason: "Organize suas matérias e vincule os conteúdos aos seus concursos.",
  };
}
