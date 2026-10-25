import { sql } from "drizzle-orm";
import {
  pgTable,
  integer,
  uuid,
  text,
  boolean,
  date,
  doublePrecision,
  timestamp,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
export const workspaces = pgTable(
  "workspaces",
  {
    id: integer("id").primaryKey(),
    version: integer("version").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [check("workspaces_version_check", sql`${t.version} >= 0`)],
);
export const profiles = pgTable("profiles", {
  workspaceId: integer("workspace_id")
    .primaryKey()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull().default(""),
});
export const studyPlans = pgTable(
  "study_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    target: text("target").notNull().default(""),
    examDate: date("exam_date"),
    startDate: date("start_date").notNull(),
    weeklyHours: doublePrecision("weekly_hours").notNull().default(14),
    configured: boolean("configured").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("study_plans_workspace_idx").on(t.workspaceId),
    check("study_plans_hours_check", sql`${t.weeklyHours} between 1 and 70`),
    check(
      "study_plans_target_check",
      sql`not ${t.configured} or length(trim(${t.target})) > 0`,
    ),
  ],
);
export const subjects = pgTable(
  "subjects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => studyPlans.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    weight: doublePrecision("weight").notNull().default(1),
    materialUrl: text("material_url"),
    position: integer("position").generatedByDefaultAsIdentity(),
    createdAt: createdAt(),
  },
  (t) => [
    index("subjects_plan_weight_idx").on(t.planId, t.weight.desc(), t.position),
    check("subjects_name_check", sql`length(trim(${t.name})) > 0`),
    check("subjects_weight_check", sql`${t.weight} between 1 and 10`),
    check("subjects_position_check", sql`${t.position} >= 0`),
  ],
);
export const topics = pgTable(
  "topics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    read: boolean("is_read").notNull().default(false),
    mastered: boolean("is_mastered").notNull().default(false),
    position: integer("position").generatedByDefaultAsIdentity(),
    createdAt: createdAt(),
  },
  (t) => [
    index("topics_subject_position_idx").on(t.subjectId, t.position),
    check("topics_name_check", sql`length(trim(${t.name})) > 0`),
    check("topics_position_check", sql`${t.position} >= 0`),
  ],
);
export const studySessions = pgTable(
  "study_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    topicId: uuid("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    date: date("studied_on").notNull(),
    minutes: doublePrecision("minutes").notNull(),
    recall: text("recall").notNull().default(""),
    questions: integer("questions").notNull().default(0),
    correct: integer("correct").notNull().default(0),
    kind: text("kind", { enum: ["reading", "active", "mock"] }).notNull(),
    createdAt: createdAt(),
    position: integer("position").generatedByDefaultAsIdentity(),
  },
  (t) => [
    index("sessions_topic_date_idx").on(t.topicId, t.date.desc()),
    index("sessions_date_idx").on(t.date.desc()),
    check("sessions_minutes_check", sql`${t.minutes} between 1 and 600`),
    check(
      "sessions_questions_check",
      sql`${t.questions} between 0 and 1000 and ${t.correct} between 0 and ${t.questions}`,
    ),
    check("sessions_kind_check", sql`${t.kind} in ('reading','active','mock')`),
    check("sessions_position_check", sql`${t.position} >= 0`),
  ],
);
export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    topicId: uuid("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    due: date("due_on").notNull(),
    interval: integer("interval_days").notNull(),
    done: boolean("done").notNull().default(false),
    position: integer("position").generatedByDefaultAsIdentity(),
    createdAt: createdAt(),
  },
  (t) => [
    index("reviews_topic_idx").on(t.topicId),
    index("reviews_pending_due_idx")
      .on(t.due, t.topicId)
      .where(sql`not ${t.done}`),
    uniqueIndex("reviews_pending_topic_interval_idx")
      .on(t.topicId, t.interval)
      .where(sql`not ${t.done}`),
    check("reviews_interval_check", sql`${t.interval} in (1,7,30)`),
    check("reviews_position_check", sql`${t.position} >= 0`),
  ],
);
export const errorReasons = pgTable(
  "error_reasons",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    label: text("label").notNull(),
  },
  (t) => [
    uniqueIndex("error_reasons_label_idx").on(t.label),
    check("error_reasons_label_check", sql`length(trim(${t.label})) > 0`),
  ],
);
export const errorEntries = pgTable(
  "error_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    topic: text("topic_label").notNull().default(""),
    reasonId: integer("reason_id")
      .notNull()
      .references(() => errorReasons.id, { onDelete: "restrict" }),
    rule: text("learned_rule").notNull(),
    source: text("source").notNull().default(""),
    resolved: boolean("resolved").notNull().default(false),
    date: date("recorded_on").notNull(),
    position: integer("position").generatedByDefaultAsIdentity(),
    createdAt: createdAt(),
  },
  (t) => [
    index("errors_subject_date_idx").on(t.subjectId, t.date.desc()),
    index("errors_reason_idx").on(t.reasonId),
    index("errors_unresolved_idx")
      .on(t.subjectId, t.date)
      .where(sql`not ${t.resolved}`),
    check("errors_rule_check", sql`length(trim(${t.rule})) > 0`),
    check("errors_position_check", sql`${t.position} >= 0`),
  ],
);
export const reminders = pgTable(
  "reminders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    text: text("content").notNull(),
    kind: text("kind", {
      enum: ["memorize", "attention", "jurisprudence", "observation"],
    }).notNull(),
    streak: integer("streak").notNull().default(0),
    position: integer("position").generatedByDefaultAsIdentity(),
    createdAt: createdAt(),
  },
  (t) => [
    index("reminders_subject_idx").on(t.subjectId),
    index("reminders_priority_idx")
      .on(t.subjectId, t.position)
      .where(sql`${t.streak} < 3`),
    check("reminders_content_check", sql`length(trim(${t.text})) > 0`),
    check("reminders_streak_check", sql`${t.streak} >= 0`),
    check(
      "reminders_kind_check",
      sql`${t.kind} in ('memorize','attention','jurisprudence','observation')`,
    ),
    check("reminders_position_check", sql`${t.position} >= 0`),
  ],
);
