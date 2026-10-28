// @vitest-environment node
import { afterAll, beforeAll, describe, it, expect } from "vitest";
import { buildApp } from "../server/app";
import { migrateDatabase } from "../server/migrate";
import { sandboxDatabase } from "./database";
import {
  initialState,
  today,
  addDays,
  type Command,
  type State,
} from "../server/domain";
import {
  initializeWorkspace,
  executeRelationalCommand,
} from "../server/repository";
import { sql } from "drizzle-orm";
let sandbox: Awaited<ReturnType<typeof sandboxDatabase>>;
let app: Awaited<ReturnType<typeof buildApp>>;
async function current() {
  return (await app.inject("/api/state")).json<{
    version: number;
    data: State;
  }>();
}
async function send(command: Command) {
  return app.inject({
    method: "POST",
    url: "/api/commands",
    payload: { version: (await current()).version, command },
  });
}
async function subjectAndTopic() {
  const sub = (await current()).data.subjects[0]!;
  const result = await send({
    type: "topic",
    subjectId: sub.id,
    name: "Tópico " + crypto.randomUUID(),
  });
  expect(result.statusCode).toBe(200);
  const topic = result.json<{ data: State }>().data.subjects[0]!.topics.at(-1)!;
  return { subjectId: sub.id, topicId: topic.id };
}
beforeAll(async () => {
  sandbox = await sandboxDatabase();
  await migrateDatabase(sandbox.db);
  app = await buildApp(sandbox.db);
});
afterAll(async () => {
  await app?.close();
  await sandbox?.close();
});
describe("API relacional com PostgreSQL", () => {
  it("cria a Revisão de Véspera protegida e persiste domínio opcional", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/api/commands",
      payload: {
        version: (await current()).version,
        command: { type: "subject", name: "Matéria com domínio" },
      },
    });
    expect(created.statusCode).toBe(200);
    let subject = created
      .json<{ data: State }>()
      .data.subjects.find((item) => item.name === "Matéria com domínio")!;
    expect(subject).toMatchObject({ domain: null });
    expect(subject.topics).toEqual([
      expect.objectContaining({
        name: "Revisão de Véspera",
        kind: "eve_review",
        read: false,
      }),
    ]);

    const domain = await app.inject({
      method: "POST",
      url: "/api/commands",
      payload: {
        version: (await current()).version,
        command: { type: "domain", id: subject.id, domain: 0 },
      },
    });
    expect(domain.statusCode).toBe(200);
    subject = domain
      .json<{ data: State }>()
      .data.subjects.find((item) => item.id === subject.id)!;
    expect(subject).toMatchObject({ domain: 0 });

    const special = subject.topics[0]!;
    expect(
      (
        await send({
          type: "editTopic",
          subjectId: subject.id,
          id: special.id,
          name: "Outro nome",
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (
        await send({
          type: "deleteTopic",
          subjectId: subject.id,
          id: special.id,
        })
      ).statusCode,
    ).toBe(400);
  });
  it("inicializa sem documentos e persiste em tabelas", async () => {
    const initial = await current();
    expect(
      initial.data.subjects.filter((subject) =>
        initialState().subjects.some((seed) => seed.name === subject.name),
      ),
    ).toHaveLength(16);
    const columns =
      await sandbox.client`select table_name,column_name from information_schema.columns where table_schema=${sandbox.schema} and data_type in ('json','jsonb','ARRAY')`;
    expect(columns).toHaveLength(0);
    const result = await send({
      type: "subject",
      name: "Matéria de integração",
    });
    expect(result.statusCode).toBe(200);
    expect(
      await sandbox.client`select name from subjects where name='Matéria de integração'`,
    ).toHaveLength(1);
  });
  it("serializa comandos concorrentes e rejeita versão antiga", async () => {
    const version = (await current()).version;
    const payload = {
      version,
      command: { type: "subject", name: "Concorrente" },
    };
    const responses = await Promise.all([
      app.inject({ method: "POST", url: "/api/commands", payload }),
      app.inject({ method: "POST", url: "/api/commands", payload }),
    ]);
    expect(responses.map((r) => r.statusCode).sort()).toEqual([200, 409]);
    expect(
      await sandbox.client`select id from subjects where name='Concorrente'`,
    ).toHaveLength(1);
  });
  it("registra ciclo ativo fora da ordem sem marcar primeira leitura", async () => {
    const name = "Fora da ordem " + crypto.randomUUID();
    const created = await send({ type: "subject", name });
    const subject = created
      .json<{ data: State }>()
      .data.subjects.find((item) => item.name === name)!;
    const withTopic = await send({
      type: "topic",
      subjectId: subject.id,
      name: "Tópico ainda não lido",
    });
    const pair = {
      subjectId: subject.id,
      topicId: withTopic
        .json<{ data: State }>()
        .data.subjects.find((item) => item.id === subject.id)!
        .topics.find((item) => item.kind === "regular")!.id,
    };
    const before = await current();
    const response = await send({
      type: "session",
      session: {
        ...pair,
        id: crypto.randomUUID(),
        date: today(),
        minutes: 30,
        recall: "a\nb\nc\nd\ne",
        questions: 20,
        correct: 17,
        kind: "active",
      },
    });
    expect(response.statusCode).toBe(200);
    const after = await current();
    expect(after.data.sessions).toHaveLength(before.data.sessions.length + 1);
    const topic = after.data.subjects
      .flatMap((subject) => subject.topics)
      .find((item) => item.id === pair.topicId)!;
    expect(topic.read).toBe(false);
    expect(
      (await send({ type: "deleteSubject", id: subject.id })).statusCode,
    ).toBe(200);
  });
  it("leitura e ciclo ativo agendam revisões sem duplicar sessão", async () => {
    const state = await current();
    for (const topic of state.data.subjects[0]!.topics.filter(
      (item) => item.kind === "regular",
    )) {
      const result = await send({
        type: "session",
        session: {
          id: crypto.randomUUID(),
          subjectId: state.data.subjects[0]!.id,
          topicId: topic.id,
          date: today(),
          minutes: 25,
          recall: "",
          questions: 0,
          correct: 0,
          kind: "reading",
        },
      });
      expect(result.statusCode).toBe(200);
    }
    expect((await current()).data.reviews).toHaveLength(0);
    const session = {
      id: crypto.randomUUID(),
      subjectId: state.data.subjects[0]!.id,
      topicId: state.data.subjects[0]!.topics[0]!.id,
      date: today(),
      minutes: 30,
      recall: "a\nb\nc\nd\ne",
      questions: 20,
      correct: 17,
      kind: "active" as const,
    };
    expect((await send({ type: "session", session })).statusCode).toBe(200);
    expect((await send({ type: "session", session })).statusCode).toBe(200);
    const result = await current();
    expect(
      result.data.sessions.filter((s) => s.id === session.id),
    ).toHaveLength(1);
    expect(result.data.reviews.map((r) => r.due)).toEqual(
      [1, 7, 30].map((n) => addDays(today(), n)),
    );
  });
  it("simulado não conclui a primeira leitura do tópico associado", async () => {
    const pair = await subjectAndTopic();
    const response = await send({
      type: "session",
      session: {
        ...pair,
        id: crypto.randomUUID(),
        date: today(),
        minutes: 120,
        recall: "",
        questions: 100,
        correct: 70,
        kind: "mock",
      },
    });
    expect(response.statusCode).toBe(200);
    const topic = (await current()).data.subjects
      .flatMap((subject) => subject.topics)
      .find((item) => item.id === pair.topicId)!;
    expect(topic.read).toBe(false);
  });
  it("resultado de revisão não altera domínio nem cria regra de 80%", async () => {
    const review = (await current()).data.reviews.find(
      (r) => r.interval === 30 && !r.done,
    )!;
    const result = await send({
      type: "review",
      id: review.id,
      questions: 20,
      correct: 16,
    });
    expect(result.statusCode).toBe(200);
    const state = (await current()).data;
    expect(
      state.reviews.filter((r) => r.interval === 30 && !r.done),
    ).toHaveLength(0);
    expect(state.subjects[0]!.topics[0]!.mastered).toBe(false);
    expect(state.sessions.at(-1)!.kind).toBe("active");
  });
  it("normaliza causas e calcula prioridade dos lembretes", async () => {
    const sub = (await current()).data.subjects[0]!;
    for (let i = 0; i < 2; i++)
      expect(
        (
          await send({
            type: "error",
            error: {
              id: crypto.randomUUID(),
              subjectId: sub.id,
              topic: "Atos",
              reason: "Confundi conceitos",
              rule: "Regra aprendida",
              source: "Banca",
              resolved: false,
              date: today(),
            },
          })
        ).statusCode,
      ).toBe(200);
    expect(
      await sandbox.client`select id from error_reasons where label='Confundi conceitos'`,
    ).toHaveLength(1);
    const reminder = {
      id: crypto.randomUUID(),
      subjectId: sub.id,
      text: "Lembrete",
      kind: "memorize" as const,
      streak: 0,
      marked: true,
    };
    expect((await send({ type: "reminder", reminder })).statusCode).toBe(200);
    for (let i = 0; i < 3; i++)
      expect(
        (await send({ type: "remember", id: reminder.id, known: true }))
          .statusCode,
      ).toBe(200);
    expect((await current()).data.reminders[0]!.marked).toBe(false);
    await send({ type: "remember", id: reminder.id, known: false });
    expect((await current()).data.reminders[0]!.streak).toBe(0);
  });
  it("atualiza perfil, matérias, tópicos e erros em suas tabelas", async () => {
    expect(
      (
        await send({
          type: "profile",
          profile: {
            ...initialState().profile,
            name: "Pessoa",
            target: "Concurso",
            configured: true,
            hours: 12,
          },
        })
      ).statusCode,
    ).toBe(200);
    const state = (await current()).data;
    const sub = state.subjects[0]!;
    expect(
      (await send({ type: "domain", id: sub.id, domain: 4 })).statusCode,
    ).toBe(200);
    expect(
      (
        await send({
          type: "editSubject",
          id: sub.id,
          name: "Novo nome",
          materialUrl: "https://example.com/material",
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await send({
          type: "editTopic",
          id: sub.topics.find((topic) => topic.kind === "regular")!.id,
          subjectId: sub.id,
          name: "Novo tópico",
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (await send({ type: "resolve", id: state.errors[0]!.id })).statusCode,
    ).toBe(200);
    const after = (await current()).data;
    expect(after.subjects[0]!.name).toBe("Novo nome");
    expect(after.profile.hours).toBe(12);
    expect(after.errors[0]!.resolved).toBe(true);
  });
  it("exclui a matéria e seus dados relacionados", async () => {
    const created = await send({
      type: "subject",
      name: "Matéria descartável",
    });
    expect(created.statusCode).toBe(200);
    const subject = (await current()).data.subjects.find(
      (item) => item.name === "Matéria descartável",
    )!;
    expect(
      (
        await send({
          type: "topic",
          subjectId: subject.id,
          name: "Tópico descartável",
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (await send({ type: "deleteSubject", id: subject.id })).statusCode,
    ).toBe(200);
    expect(
      (await current()).data.subjects.some((item) => item.id === subject.id),
    ).toBe(false);
    expect(
      await sandbox.client`select id from topics where subject_id=${subject.id}`,
    ).toHaveLength(0);
  });
  it("exclui um tópico e normaliza a ordem dos restantes", async () => {
    const subject = (await current()).data.subjects[0]!;
    expect(
      (
        await send({
          type: "topics",
          subjectId: subject.id,
          names: ["Excluir este", "Manter este"],
        })
      ).statusCode,
    ).toBe(200);
    const updated = (await current()).data.subjects[0]!;
    const removed = updated.topics.find(
      (topic) => topic.name === "Excluir este",
    )!;
    expect(
      (
        await send({
          type: "deleteTopic",
          subjectId: subject.id,
          id: removed.id,
        })
      ).statusCode,
    ).toBe(200);
    const remaining = await sandbox.client`
      select position from topics
      where subject_id=${subject.id}
      order by position
    `;
    expect(remaining.map((topic) => topic.position)).toEqual(
      remaining.map((_, position) => position),
    );
    expect(
      (await current()).data.subjects[0]!.topics.some(
        (topic) => topic.id === removed.id,
      ),
    ).toBe(false);
  });
  it("impede acesso cruzado entre espaços e relações inconsistentes", async () => {
    await initializeWorkspace(sandbox.db, 2);
    const other = (
      await executeRelationalCommand(
        sandbox.db,
        0,
        {
          type: "topic",
          subjectId: (
            await sandbox.client`select subjects.id from subjects join study_plans p on p.id=subjects.plan_id where p.workspace_id=2 limit 1`
          )[0]!.id,
          name: "Outro",
        },
        2,
      )
    ).data.subjects[0]!;
    const before = await current();
    expect(
      (await send({ type: "domain", id: other.id, domain: 5 })).statusCode,
    ).toBe(400);
    const own = before.data.subjects[0]!;
    expect(
      (
        await send({
          type: "editTopic",
          id: own.topics[0]!.id,
          subjectId: other.id,
          name: "Não autorizado",
        })
      ).statusCode,
    ).toBe(400);
    expect(await current()).toEqual(before);
  });
  it("PostgreSQL rejeita órfãos, resultados impossíveis e revisão pendente duplicada", async () => {
    await expect(
      sandbox.client`insert into topics(subject_id,name) values (${crypto.randomUUID()},'Órfão')`,
    ).rejects.toMatchObject({ code: "23503" });
    const topic = (await current()).data.subjects[0]!.topics[0]!;
    await expect(
      sandbox.client`insert into study_sessions(topic_id,studied_on,minutes,questions,correct,kind) values (${topic.id},current_date,20,10,11,'mock')`,
    ).rejects.toMatchObject({ code: "23514" });
    const review = (await current()).data.reviews.find((r) => !r.done)!;
    await expect(
      sandbox.client`insert into reviews(topic_id,due_on,interval_days) values (${review.topicId},current_date,${review.interval})`,
    ).rejects.toMatchObject({ code: "23505" });
  });
  it("rejeita entrada inválida sem mudar versão", async () => {
    const before = await current();
    const response = await app.inject({
      method: "POST",
      url: "/api/commands",
      payload: {
        version: before.version,
        command: { type: "subject", name: "" },
      },
    });
    expect(response.statusCode).toBe(400);
    expect(await current()).toEqual(before);
  });
  it("todas as chaves estrangeiras possuem índice no lado dependente", async () => {
    const missing = await sandbox.db.execute(
      sql`select c.conname from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace where c.contype='f' and n.nspname=current_schema() and not exists(select 1 from pg_index i where i.indrelid=c.conrelid and i.indpred is null and i.indkey[0]=c.conkey[1])`,
    );
    expect(missing).toHaveLength(0);
  });
});
