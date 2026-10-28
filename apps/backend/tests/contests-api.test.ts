// @vitest-environment node
import { it, expect } from "vitest";
import { sandboxDatabase } from "./database.js";
import { migrateDatabase } from "../server/migrate.js";
import {
  initializeWorkspace,
  readWorkspace,
  executeRelationalCommand,
} from "../server/repository.js";
import { today, type Contest, type Command } from "../server/domain.js";
it("edital relacional preserva histórico, valida vínculos e isola espaços", async () => {
  const box = await sandboxDatabase();
  try {
    await migrateDatabase(box.db);
    await initializeWorkspace(box.db);
    await initializeWorkspace(box.db, 2);
    const send = async (c: Command) =>
      executeRelationalCommand(
        box.db,
        (await readWorkspace(box.db)).version,
        c,
      );
    let s = (await readWorkspace(box.db)).data;
    const subject = s.subjects[0]!;
    await send({
      type: "topics",
      subjectId: subject.id,
      names: ["Comum", "Fora do edital"],
    });
    s = (await readWorkspace(box.db)).data;
    const originalTopics = s.subjects[0]!.topics;
    await send({
      type: "reorderTopics",
      subjectId: subject.id,
      topicIds: originalTopics.map((topic) => topic.id).reverse(),
    });
    s = (await readWorkspace(box.db)).data;
    expect(s.subjects[0]!.topics.map((topic) => topic.name)).toEqual([
      "Fora do edital",
      "Comum",
      "Revisão de Véspera",
    ]);
    const topic = s.subjects[0]!.topics[0]!;
    const contest: Contest = {
      id: crypto.randomUUID(),
      name: "Auditor",
      role: "Auditor fiscal",
      vacancies: 30,
      salary: 18500,
      educationLevel: "superior",
      examDate: "2027-02-01",
      archived: false,
      subjects: [
        {
          subjectId: subject.id,
          weight: 5,
          allTopics: false,
          topicIds: [topic.id],
        },
      ],
    };
    const saved = await send({ type: "contest", contest });
    expect(saved.data.contests).toEqual([contest]);
    await send({
      type: "session",
      session: {
        id: crypto.randomUUID(),
        subjectId: subject.id,
        topicId: topic.id,
        date: today(),
        minutes: 20,
        recall: "",
        questions: 0,
        correct: 0,
        kind: "reading",
      },
    });
    const otherTopic = s.subjects[0]!.topics.find(
      (candidate) => candidate.kind === "regular" && candidate.id !== topic.id,
    )!;
    await send({
      type: "session",
      session: {
        id: crypto.randomUUID(),
        subjectId: subject.id,
        topicId: otherTopic.id,
        date: today(),
        minutes: 20,
        recall: "",
        questions: 0,
        correct: 0,
        kind: "reading",
      },
    });
    await send({
      type: "session",
      session: {
        id: crypto.randomUUID(),
        subjectId: subject.id,
        topicId: topic.id,
        date: today(),
        minutes: 20,
        recall: "a\nb\nc\nd\ne",
        questions: 0,
        correct: 0,
        kind: "active",
      },
    });
    const second = { ...contest, id: crypto.randomUUID(), name: "Outro" };
    await send({ type: "contest", contest: second });
    expect((await readWorkspace(box.db)).data.reviews).toHaveLength(3);
    await send({
      type: "contest",
      contest: { ...contest, subjects: [], archived: true },
    });
    const before = await readWorkspace(box.db);
    expect(before.data.sessions).toHaveLength(3);
    expect(before.data.reviews).toHaveLength(3);
    const foreign = (await readWorkspace(box.db, 2)).data.subjects[0]!;
    await expect(
      send({
        type: "contest",
        contest: {
          ...second,
          subjects: [{ ...second.subjects[0]!, subjectId: foreign.id }],
        },
      }),
    ).rejects.toThrow("Matéria");
    expect(await readWorkspace(box.db)).toEqual(before);
    await expect(
      executeRelationalCommand(
        box.db,
        (await readWorkspace(box.db, 2)).version,
        { type: "contest", contest: second },
        2,
      ),
    ).rejects.toThrow("Concurso");
    await send({ type: "topic", subjectId: s.subjects[1]!.id, name: "Outra" });
    const wrongTopic = (await readWorkspace(box.db)).data.subjects[1]!
      .topics[0]!;
    await expect(
      send({
        type: "contest",
        contest: {
          ...second,
          subjects: [{ ...second.subjects[0]!, topicIds: [wrongTopic.id] }],
        },
      }),
    ).rejects.toThrow("Tópico");
    await expect(
      box.client`insert into contest_topics(contest_id,subject_id,topic_id) values(${second.id},${subject.id},${wrongTopic.id})`,
    ).rejects.toThrow();
    await expect(
      send({
        type: "contest",
        contest: {
          ...second,
          subjects: [second.subjects[0]!, second.subjects[0]!],
        },
      }),
    ).rejects.toThrow("repetida");
    expect(
      await box.client`select * from contest_topics where contest_id=${second.id}`,
    ).toHaveLength(1);
  } finally {
    await box.close();
  }
});
