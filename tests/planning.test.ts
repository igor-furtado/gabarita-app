import { expect, it } from "vitest";
import {
  initialState,
  recommendation,
  phase,
  type Contest,
} from "../server/domain";
import { contestProgress } from "../server/planning";
const date = "2026-10-26";
function setup() {
  const s = initialState();
  s.subjects = s.subjects.slice(0, 3);
  for (const subject of s.subjects)
    subject.topics = [
      { id: crypto.randomUUID(), name: "Comum", read: false, mastered: false },
      { id: crypto.randomUUID(), name: "Extra", read: false, mastered: false },
    ];
  const make = (
    name: string,
    examDate: string,
    subjects: Contest["subjects"],
  ): Contest => ({
    id: crypto.randomUUID(),
    name,
    role: "",
    vacancies: null,
    salary: null,
    educationLevel: "",
    examDate,
    archived: false,
    subjects,
  });
  const link = (index: number, weight = 3) => ({
    subjectId: s.subjects[index]!.id,
    weight,
    allTopics: false,
    topicIds: [s.subjects[index]!.topics[0]!.id],
  });
  s.contests = [
    make("Próximo", "2026-11-10", [link(0), link(1)]),
    make("Distante", "2027-03-01", [link(0), link(2, 10)]),
  ];
  return s;
}
it("prioriza conteúdo compartilhado da prova próxima e explica o aproveitamento", () => {
  const s = setup();
  const r = recommendation(s, date);
  expect(r.kind).toBe("reading");
  expect("subject" in r && r.subject?.id).toBe(s.subjects[0]!.id);
  expect(r.reason).toContain("Próximo");
  expect(r.reason).toContain("Distante");
});
it("peso do edital próximo prevalece sobre bônus limitado de compartilhamento", () => {
  const s = setup();
  s.contests![0]!.subjects[1]!.weight = 8;
  const r = recommendation(s, date);
  expect("subject" in r && r.subject?.id).toBe(s.subjects[1]!.id);
});
it("mudar a data muda a prioridade e a fase usa a prova atual", () => {
  const s = setup();
  s.contests![1]!.examDate = "2026-10-30";
  const r = recommendation(s, date);
  expect("subject" in r && r.subject?.id).toBe(s.subjects[2]!.id);
  expect(phase(s, date)).toBe("Reta final");
});
it("exclui arquivados e provas passadas, sem estudar tópicos fora do edital", () => {
  const s = setup();
  s.contests![0]!.archived = true;
  s.contests![1]!.examDate = "2026-10-25";
  expect(recommendation(s, date).kind).toBe("organize");
  s.contests![1]!.examDate = "";
  const r = recommendation(s, date);
  expect("topic" in r && r.topic?.name).toBe("Comum");
});
it("progresso compartilhado é calculado apenas nos tópicos incluídos", () => {
  const s = setup();
  s.subjects[0]!.topics[0]!.read = true;
  s.subjects[0]!.topics[1]!.read = true;
  expect(contestProgress(s, s.contests![0]!)).toEqual({
    total: 2,
    read: 1,
    mastered: 0,
  });
  expect(contestProgress(s, s.contests![1]!)).toEqual({
    total: 2,
    read: 1,
    mastered: 0,
  });
  s.contests![0]!.subjects[0]!.allTopics = true;
  expect(contestProgress(s, s.contests![0]!).total).toBe(3);
});
it("revisões e domingo continuam prioritários", () => {
  const s = setup();
  s.reviews = [
    {
      id: "r",
      topicId: s.subjects[0]!.topics[0]!.id,
      subjectId: s.subjects[0]!.id,
      due: "2026-10-20",
      interval: 1,
      done: false,
    },
  ];
  expect(recommendation(s, date).kind).toBe("review");
  expect(recommendation(s, "2026-10-25").kind).toBe("rest");
});
it("ciclo ativo respeita a leitura do conteúdo incluído e não exige tópicos fora dos editais", () => {
  const s = setup();
  s.subjects[0]!.topics[0]!.read = true;
  expect(recommendation(s, date).kind).toBe("active");
});
