import { describe, it, expect } from "vitest";
import {
  initialState,
  validateSession,
  validateReview,
  addDays,
  today,
  phase,
} from "../server/domain";
function fixture() {
  const s = initialState();
  s.subjects[0]!.topics = [
    { id: "topic", name: "Atos administrativos", read: false, mastered: false },
  ];
  return s;
}
describe("Validações do método", () => {
  const session = {
    id: crypto.randomUUID(),
    subjectId: crypto.randomUUID(),
    topicId: crypto.randomUUID(),
    date: today(),
    minutes: 30,
    recall: "a\nb\nc\nd\ne",
    questions: 20,
    correct: 17,
    kind: "active" as const,
  };
  it("bloqueia ciclo ativo antes de concluir a leitura", () =>
    expect(() => validateSession(session, false)).toThrow("primeira leitura"));
  it("exige cinco linhas", () =>
    expect(() =>
      validateSession({ ...session, recall: "Só uma linha" }, true),
    ).toThrow("cinco linhas"));
  it("rejeita mais acertos que questões", () =>
    expect(() => validateSession({ ...session, correct: 21 }, true)).toThrow(
      "Acertos",
    ));
  it("exige vinte questões na revisão de 30 dias", () =>
    expect(() => validateReview(30, 19, 19)).toThrow("20 questões"));
  it("aceita revisão curta sem questões", () =>
    expect(() => validateReview(1, 0, 0)).not.toThrow());
  it("prioriza rota curta até 30 dias", () => {
    const s = fixture();
    s.profile.examDate = addDays(today(), 20);
    expect(phase(s)).toBe("Reta final");
  });
});

import { recommendation } from "../server/domain";
it("domingo é descanso mesmo com revisão pendente", () => {
  const s = fixture();
  s.reviews = [
    {
      id: "r",
      topicId: "topic",
      subjectId: s.subjects[0]!.id,
      due: "2026-10-24",
      interval: 1,
      done: false,
    },
  ];
  expect(recommendation(s, "2026-10-25").kind).toBe("rest");
});
it("prioriza revisões atrasadas no próximo dia útil", () => {
  const s = fixture();
  s.reviews = [
    {
      id: "r",
      topicId: "topic",
      subjectId: s.subjects[0]!.id,
      due: "2026-10-24",
      interval: 1,
      done: false,
    },
  ];
  expect(recommendation(s, "2026-10-26").kind).toBe("review");
});
it("sem prova marcada não força a reta final por tempo decorrido", () => {
  const s = fixture();
  s.profile.startDate = "2025-01-01";
  expect(phase(s, "2026-10-20")).toBe("Fundação");
});
it("intercala a próxima matéria quando há alternativas", () => {
  const s = fixture();
  s.subjects[1]!.topics = [
    {
      id: "other",
      name: "Direitos fundamentais",
      read: false,
      mastered: false,
    },
  ];
  s.sessions = [
    {
      id: "1",
      subjectId: s.subjects[0]!.id,
      topicId: "topic",
      kind: "reading",
      date: today(),
      minutes: 20,
      recall: "",
      questions: 0,
      correct: 0,
    },
  ];
  const result = recommendation(s, "2026-10-20");
  expect("subject" in result && result.subject?.id).toBe(s.subjects[1]!.id);
});
