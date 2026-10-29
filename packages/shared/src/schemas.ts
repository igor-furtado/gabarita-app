import { z } from "zod";

function validDate(value: string) {
  const date = new Date(value + "T12:00:00Z");
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

export const subjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  domain: z.number().int().min(0).max(5).nullable().default(null),
  materialUrl: z.string().optional(),
  topics: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string().min(1),
      read: z.boolean(),
      mastered: z.boolean(),
      kind: z.enum(["regular", "eve_review"]).default("regular"),
    }),
  ),
});

export const profileSchema = z.object({
  name: z.string().min(1),
  target: z.string(),
  examDate: z
    .string()
    .refine((value) => value === "" || validDate(value), "Data inválida."),
  startDate: z.string().refine(validDate, "Data inválida."),
  hours: z.number().min(1).max(24),
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

export const contestSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(160),
  role: z.string().trim().max(160),
  vacancies: z.number().int().min(0).nullable(),
  salary: z.number().min(0).nullable(),
  educationLevel: z.enum(["", "medio", "tecnico", "superior"]),
  examDate: z
    .string()
    .refine((value) => value === "" || validDate(value), "Data inválida."),
  archived: z.boolean(),
  subjects: z.array(
    z.object({
      subjectId: z.string().uuid(),
      weight: z.number().min(1).max(10),
      allTopics: z.boolean(),
      topicIds: z.array(z.string().uuid()),
    }),
  ),
});

export const stateSchema = z.object({
  profile: profileSchema,
  contests: z.array(contestSchema).optional(),
  subjects: z.array(subjectSchema),
  sessions: z.array(sessionSchema),
  reviews: z.array(reviewSchema),
  errors: z.array(errorSchema),
  reminders: z.array(reminderSchema),
});

export const commandSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("contest"), contest: contestSchema }),
  z.object({ type: z.literal("profile"), profile: profileSchema }),
  z.object({ type: z.literal("subject"), name: z.string().min(1).max(120) }),
  z.object({
    type: z.literal("editSubject"),
    id: z.string().uuid(),
    name: z.string().min(1).max(120),
    materialUrl: z
      .string()
      .refine(
        (value) => !value || /^https?:\/\//.test(value),
        "Use um endereço http ou https.",
      ),
  }),
  z.object({ type: z.literal("deleteSubject"), id: z.string().uuid() }),
  z.object({
    type: z.literal("editTopic"),
    subjectId: z.string().uuid(),
    id: z.string().uuid(),
    name: z.string().min(1).max(200),
  }),
  z.object({
    type: z.literal("deleteTopic"),
    subjectId: z.string().uuid(),
    id: z.string().uuid(),
  }),
  z.object({
    type: z.literal("domain"),
    id: z.string().uuid(),
    domain: z.number().int().min(0).max(5),
  }),
  z.object({
    type: z.literal("topic"),
    subjectId: z.string().uuid(),
    name: z.string().min(1).max(200),
  }),
  z.object({
    type: z.literal("topics"),
    subjectId: z.string().uuid(),
    names: z.array(z.string().trim().min(1).max(200)).min(1).max(100),
  }),
  z.object({
    type: z.literal("reorderTopics"),
    subjectId: z.string().uuid(),
    topicIds: z.array(z.string().uuid()).min(1),
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

export type Contest = z.infer<typeof contestSchema>;
export type State = z.infer<typeof stateSchema>;
export type Session = z.infer<typeof sessionSchema>;
export type Command = z.infer<typeof commandSchema>;
