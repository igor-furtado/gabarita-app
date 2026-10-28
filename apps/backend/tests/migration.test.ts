// @vitest-environment node
import { it, expect } from "vitest";
import { sandboxDatabase } from "./database.js";
import { migrateDatabase } from "../server/migrate.js";
import { readWorkspace, executeRelationalCommand } from "../server/repository.js";
import { initialState, today } from "../server/domain.js";
function legacy() {
  const s = initialState();
  s.profile = {
    ...s.profile,
    name: "Ana",
    target: "Auditoria",
    examDate: "2027-04-15",
    configured: true,
    hours: 12.5,
  };
  s.subjects = s.subjects.slice(0, 2);
  const sub = s.subjects[0]!;
  sub.materialUrl = "https://example.com/a";
  sub.topics = [
    {
      id: crypto.randomUUID(),
      name: "Primeiro tópico",
      read: true,
      mastered: false,
      kind: "regular",
    },
    {
      id: crypto.randomUUID(),
      name: "Segundo tópico",
      read: false,
      mastered: false,
      kind: "regular",
    },
  ];
  const topic = sub.topics[0]!;
  s.sessions = [
    {
      id: crypto.randomUUID(),
      subjectId: sub.id,
      topicId: topic.id,
      date: "2026-10-20",
      minutes: 25.5,
      recall: "Minhas anotações\na\nb\nc\nd",
      questions: 20,
      correct: 16,
      kind: "active",
    },
  ];
  s.reviews = [
    {
      id: crypto.randomUUID(),
      topicId: topic.id,
      subjectId: sub.id,
      due: "2026-11-19",
      interval: 30,
      done: false,
    },
    {
      id: crypto.randomUUID(),
      topicId: topic.id,
      subjectId: sub.id,
      due: "2026-10-21",
      interval: 1,
      done: true,
    },
  ];
  s.errors = [
    {
      id: crypto.randomUUID(),
      subjectId: sub.id,
      topic: "Assunto livre",
      reason: "Causa personalizada",
      rule: "Regra aprendida",
      source: "Minha fonte",
      resolved: true,
      date: today(),
    },
  ];
  s.reminders = [
    {
      id: crypto.randomUUID(),
      subjectId: sub.id,
      text: "Memória",
      kind: "jurisprudence",
      streak: 3,
      marked: false,
    },
  ];
  return s;
}
it("migra todos os campos, UUIDs, datas, versões e ordem; remove o documento", async () => {
  const box = await sandboxDatabase();
  try {
    await box.client`create table workspaces (id integer primary key,version integer not null,data jsonb not null)`;
    const first = legacy(),
      second = initialState();
    await box.client`insert into workspaces values (1,42,${JSON.stringify(first)}::jsonb),(2,7,${JSON.stringify(second)}::jsonb)`;
    expect(await migrateDatabase(box.db)).toEqual({
      applied: true,
      migratedWorkspaces: 2,
    });
    const migrated = await readWorkspace(box.db, 1);
    expect(migrated.data.contests).toHaveLength(1);
    expect(migrated.data.contests![0]).toMatchObject({
      name: first.profile.target,
      examDate: first.profile.examDate,
      subjects: first.subjects
        .map((s) => ({
          subjectId: s.id,
          weight: 1,
          allTopics: true,
          topicIds: [],
        }))
        .sort((a, b) => a.subjectId.localeCompare(b.subjectId)),
    });
    const withoutEveReview = (state: ReturnType<typeof initialState>) => ({
      ...state,
      subjects: state.subjects.map((subject) => ({
        ...subject,
        topics: subject.topics.filter((topic) => topic.kind === "regular"),
      })),
    });
    const migratedFirst = await readWorkspace(box.db, 1, false);
    const migratedSecond = await readWorkspace(box.db, 2, false);
    const dailyFirst = {
      ...first,
      profile: { ...first.profile, hours: 2, configured: false },
    };
    const dailySecond = {
      ...second,
      profile: { ...second.profile, hours: 2, configured: false },
    };
    expect({
      ...migratedFirst,
      data: withoutEveReview(migratedFirst.data),
    }).toEqual({
      version: 42,
      data: withoutEveReview(dailyFirst),
    });
    expect({
      ...migratedSecond,
      data: withoutEveReview(migratedSecond.data),
    }).toEqual({
      version: 7,
      data: withoutEveReview(dailySecond),
    });
    expect(
      migratedFirst.data.subjects.every(
        (subject) =>
          subject.topics.filter((topic) => topic.kind === "eve_review")
            .length === 1,
      ),
    ).toBe(true);
    const columns =
      await box.client`select column_name from information_schema.columns where table_schema=${box.schema} and data_type in ('json','jsonb','ARRAY')`;
    expect(columns).toHaveLength(0);
    expect(await migrateDatabase(box.db)).toEqual({
      applied: false,
      migratedWorkspaces: 0,
    });
    const result = await executeRelationalCommand(box.db, 42, {
      type: "subject",
      name: "Acrescentada depois",
    });
    expect(result.data.subjects.at(-1)!.name).toBe("Acrescentada depois");
  } finally {
    await box.close();
  }
});
it("falha sem perda: inconsistência reverte DDL, importação e remoção do legado", async () => {
  const box = await sandboxDatabase();
  try {
    await box.client`create table workspaces (id integer primary key,version integer not null,data jsonb not null)`;
    const s = legacy();
    s.sessions[0]!.subjectId = s.subjects[1]!.id;
    await box.client`insert into workspaces values (1,8,${JSON.stringify(s)}::jsonb)`;
    await expect(migrateDatabase(box.db)).rejects.toThrow("incompatíveis");
    const [row] =
      await box.client`select version,data from workspaces where id=1`;
    expect(row).toEqual({ version: 8, data: s });
    const tables =
      await box.client`select table_name from information_schema.tables where table_schema=${box.schema}`;
    expect(tables.map((x) => x.table_name)).toEqual(["workspaces"]);
  } finally {
    await box.close();
  }
});
it("instalação nova cria apenas estrutura relacional e migração é idempotente", async () => {
  const box = await sandboxDatabase();
  try {
    expect((await migrateDatabase(box.db)).applied).toBe(true);
    expect((await migrateDatabase(box.db)).applied).toBe(false);
    const count = await box.client`select count(*)::int total from workspaces`;
    expect(count[0]!.total).toBe(0);
  } finally {
    await box.close();
  }
});
