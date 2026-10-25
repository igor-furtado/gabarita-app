import { z } from "zod";
export const subjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  weight: z.number().min(1).max(10),
  materialUrl: z.string().optional(),
  topics: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string().min(1),
      read: z.boolean(),
      mastered: z.boolean(),
    }),
  ),
});
export const profileSchema = z.object({
  name: z.string().min(1),
  target: z.string().min(1),
  examDate: z
    .string()
    .refine((v) => v === "" || validDate(v), "Data inválida."),
  startDate: z.string().refine(validDate, "Data inválida."),
  hours: z.number().min(1).max(70),
  configured: z.boolean(),
});
export const sessionSchema = z.object({
  id: z.string().uuid(),
  topicId: z.string().uuid(),
  subjectId: z.string().uuid(),
  date: z.string(),
  minutes: z.number().min(1).max(600),
  recall: z.string(),
  questions: z.number().int().min(0).max(1000),
  correct: z.number().int().min(0).max(1000),
  kind: z.enum(["reading", "active", "mock"]),
});
export const reviewSchema = z.object({
  id: z.string().uuid(),
  topicId: z.string().uuid(),
  subjectId: z.string().uuid(),
  due: z.string(),
  interval: z.number(),
  done: z.boolean(),
});
export const errorSchema = z.object({
  id: z.string().uuid(),
  subjectId: z.string().uuid(),
  topic: z.string(),
  reason: z.string().min(1),
  rule: z.string().min(1),
  source: z.string(),
  resolved: z.boolean(),
  date: z.string(),
});
export const reminderSchema = z.object({
  id: z.string().uuid(),
  subjectId: z.string().uuid(),
  text: z.string().min(1),
  kind: z.enum(["memorize", "attention", "jurisprudence", "observation"]),
  streak: z.number().int().min(0),
  marked: z.boolean(),
});
export const stateSchema = z.object({
  profile: profileSchema,
  subjects: z.array(subjectSchema),
  sessions: z.array(sessionSchema),
  reviews: z.array(reviewSchema),
  errors: z.array(errorSchema),
  reminders: z.array(reminderSchema),
});
export type State = z.infer<typeof stateSchema>;
export const commandSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("profile"), profile: profileSchema }),
  z.object({
    type: z.literal("subject"),
    name: z.string().min(1).max(120),
    weight: z.number().min(1).max(10),
  }),
  z.object({
    type: z.literal("editSubject"),
    id: z.string().uuid(),
    name: z.string().min(1).max(120),
    materialUrl: z
      .string()
      .refine(
        (v) => !v || /^https?:\/\//.test(v),
        "Use um endereço http ou https.",
      ),
  }),
  z.object({
    type: z.literal("editTopic"),
    subjectId: z.string().uuid(),
    id: z.string().uuid(),
    name: z.string().min(1).max(200),
  }),
  z.object({
    type: z.literal("weight"),
    id: z.string().uuid(),
    weight: z.number().min(1).max(10),
  }),
  z.object({
    type: z.literal("topic"),
    subjectId: z.string().uuid(),
    name: z.string().min(1).max(200),
  }),
  z.object({ type: z.literal("session"), session: sessionSchema }),
  z.object({
    type: z.literal("review"),
    id: z.string().uuid(),
    questions: z.number().int().min(0).max(1000),
    correct: z.number().int().min(0).max(1000),
  }),
  z.object({ type: z.literal("error"), error: errorSchema }),
  z.object({ type: z.literal("resolve"), id: z.string() }),
  z.object({ type: z.literal("reminder"), reminder: reminderSchema }),
  z.object({
    type: z.literal("remember"),
    id: z.string().uuid(),
    known: z.boolean(),
  }),
]);
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
function validDate(value: string) {
  const d = new Date(value + "T12:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}
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
      hours: 14,
      configured: false,
    },
    subjects: names.map((name, i) => ({
      id: crypto.randomUUID(),
      name,
      weight: i < 5 ? 3 : 1,
      topics: [],
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
  const remaining = s.profile.examDate
    ? Math.ceil((Date.parse(s.profile.examDate) - Date.parse(date)) / 86400000)
    : null;
  if (remaining === null) {
    const limit = s.profile.hours < 10 ? 6 : s.profile.hours < 14 ? 10 : 16;
    const selected = [...s.subjects]
      .sort((a, b) => b.weight - a.weight)
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
export type Command = z.infer<typeof commandSchema>;
export class DomainError extends Error {}
export function validateSession(
  session: z.infer<typeof sessionSchema>,
  volumeRead: boolean,
) {
  if (session.correct > session.questions)
    throw new DomainError("Acertos não podem superar questões.");
  if (session.kind === "active" && !volumeRead)
    throw new DomainError(
      "Conclua a primeira leitura da matéria antes do ciclo ativo.",
    );
  if (
    session.kind === "active" &&
    session.recall.trim().split(/\n/).filter(Boolean).length < 5
  )
    throw new DomainError("Escreva pelo menos cinco linhas de memória.");
}
export function validateReview(
  interval: number,
  questions: number,
  correct: number,
) {
  if (correct > questions) throw new DomainError("Acertos inválidos.");
  if (interval === 30 && questions < 20)
    throw new DomainError("A revisão de 30 dias exige pelo menos 20 questões.");
}

export function recommendation(s: State, date = today()) {
  if (new Date(date + "T12:00:00Z").getUTCDay() === 0)
    return { kind: "rest" as const };
  const due = s.reviews
    .filter((r) => !r.done && r.due <= date)
    .sort((a, b) => a.due.localeCompare(b.due))[0];
  if (due) return { kind: "review" as const, review: due };
  const limit = s.profile.hours < 10 ? 6 : s.profile.hours < 14 ? 10 : 16;
  const eligible = [...s.subjects]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, limit);
  const last = s.sessions.at(-1)?.subjectId;
  const ordered = [
    ...eligible.filter((x) => x.id !== last),
    ...eligible.filter((x) => x.id === last),
  ];
  for (const subject of ordered) {
    const topic = subject.topics.find((t) => !t.read);
    if (topic) return { kind: "reading" as const, subject, topic };
  }
  for (const subject of ordered) {
    const topic = subject.topics.find(
      (t) =>
        !t.mastered && !s.reviews.some((r) => r.topicId === t.id && !r.done),
    );
    if (topic) return { kind: "active" as const, subject, topic };
  }
  return { kind: "organize" as const };
}
