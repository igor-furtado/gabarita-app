import { expect, it } from "vitest";
import {
  initialState,
  recommendation,
  phase,
  type Contest,
} from "../src/index.js";
import {
  contestProgress,
  examGroups,
  planOutline,
  planReadiness,
  planStage,
  rankedSubjects,
  scenario,
  studyWeek,
} from "../src/index.js";
const date = "2026-10-26";
function setup() {
  const s = initialState();
  s.subjects = s.subjects.slice(0, 3);
  for (const subject of s.subjects)
    subject.topics = [
      {
        id: crypto.randomUUID(),
        name: "Comum",
        read: false,
        mastered: false,
        kind: "regular",
      },
      {
        id: crypto.randomUUID(),
        name: "Extra",
        read: false,
        mastered: false,
        kind: "regular",
      },
      {
        id: crypto.randomUUID(),
        name: "Revisão de Véspera",
        read: false,
        mastered: false,
        kind: "eve_review",
      },
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
    make("Próximo", "2026-12-10", [link(0), link(1)]),
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
  });
  expect(contestProgress(s, s.contests![1]!)).toEqual({
    total: 2,
    read: 1,
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
it("mantém a primeira leitura até concluir o volume inteiro da matéria", () => {
  const s = setup();
  s.subjects[0]!.topics[0]!.read = true;
  const result = recommendation(s, date);
  expect(result.kind).toBe("reading");
  expect("topic" in result && result.topic?.name).toBe("Extra");
});

it("agrupa provas em uma janela máxima de seis dias ancorada na primeira", () => {
  const s = setup();
  s.contests = [
    { ...s.contests![0]!, id: crypto.randomUUID(), examDate: "2026-11-01" },
    { ...s.contests![0]!, id: crypto.randomUUID(), examDate: "2026-11-06" },
    { ...s.contests![0]!, id: crypto.randomUUID(), examDate: "2026-11-11" },
    { ...s.contests![0]!, id: crypto.randomUUID(), examDate: "" },
  ];

  expect(
    examGroups(s, date).map((group) =>
      group.contests.map((contest) => contest.examDate || "sem data"),
    ),
  ).toEqual([["2026-11-01", "2026-11-06"], ["2026-11-11"], ["sem data"]]);
});

it.each([
  ["2026-11-25", "urgent"],
  ["2026-11-26", "short"],
  ["2026-12-25", "standard"],
  ["2027-02-25", "long"],
  ["", "undated"],
] as const)("classifica a prova %s no cenário %s", (examDate, expected) => {
  const s = setup();
  s.contests = [{ ...s.contests![0]!, examDate }];
  expect(scenario(s, date).kind).toBe(expected);
});

it("ordena matérias por grupo, peso, domínio, recorrência e nome", () => {
  const s = setup();
  s.subjects = s.subjects.slice(0, 3).map((subject, index) => ({
    ...subject,
    name: ["Beta", "Alfa", "Gama"][index]!,
    domain: [4, 1, 1][index]!,
  }));
  const [beta, alfa, gama] = s.subjects;
  s.contests = [
    {
      ...s.contests![0]!,
      id: crypto.randomUUID(),
      examDate: "2026-11-10",
      subjects: [
        { subjectId: beta!.id, weight: 2.5, allTopics: true, topicIds: [] },
        { subjectId: alfa!.id, weight: 2.5, allTopics: true, topicIds: [] },
        { subjectId: gama!.id, weight: 1, allTopics: true, topicIds: [] },
      ],
    },
    {
      ...s.contests![0]!,
      id: crypto.randomUUID(),
      examDate: "2026-11-15",
      subjects: [
        { subjectId: alfa!.id, weight: 1, allTopics: true, topicIds: [] },
      ],
    },
  ];

  expect(
    rankedSubjects(s, date).map((candidate) => candidate.subject.name),
  ).toEqual(["Alfa", "Beta", "Gama"]);
});

it("no cenário urgente percorre véspera, alterações, julgados e simulado", () => {
  const s = setup();
  s.contests![0]!.examDate = "2026-11-10";
  s.contests = [s.contests![0]!];
  for (const [index, subject] of s.subjects.entries()) {
    subject.domain = index;
  }
  s.subjects[0]!.name = "Alterações Legislativas";
  s.subjects[1]!.name = "Julgados de 2026 - STF e STJ";

  let result = recommendation(s, date);
  expect(result.kind).toBe("reading");
  expect("topic" in result && result.topic?.kind).toBe("eve_review");

  for (const subject of s.subjects)
    subject.topics.find((topic) => topic.kind === "eve_review")!.read = true;
  s.contests[0]!.subjects[0]!.topicIds = [s.subjects[0]!.topics[1]!.id];
  result = recommendation(s, date);
  expect("subject" in result && result.subject?.name).toBe(
    "Alterações Legislativas",
  );
  expect("topic" in result && result.topic?.name).toBe("Extra");

  for (const topic of s.subjects[0]!.topics) topic.read = true;
  result = recommendation(s, date);
  expect("subject" in result && result.subject?.name).toContain("Julgados");

  for (const subject of s.subjects)
    for (const topic of subject.topics) topic.read = true;
  expect(recommendation(s, date).kind).toBe("mock");

  s.sessions.push({
    id: crypto.randomUUID(),
    subjectId: s.subjects[0]!.id,
    topicId: s.subjects[0]!.topics[0]!.id,
    kind: "mock",
    date,
    minutes: 120,
    recall: "",
    questions: 100,
    correct: 70,
  });
  expect(recommendation(s, date)).toMatchObject({
    kind: "organize",
    reason: expect.stringContaining("simulado"),
  });
});

it("só libera o plano após configurar edital e domínio das matérias vinculadas", () => {
  const s = setup();
  s.profile.configured = true;
  expect(planReadiness(s, date)).toMatchObject({
    ready: false,
    missingDomains: expect.arrayContaining([
      s.subjects[0]!.id,
      s.subjects[1]!.id,
      s.subjects[2]!.id,
    ]),
  });
  for (const subject of s.subjects) subject.domain = 0;
  expect(planReadiness(s, date)).toEqual({
    ready: true,
    needsProfile: false,
    needsContest: false,
    missingDomains: [],
  });
});

it("distribui os dias dos cenários sem perder dias na divisão", () => {
  const s = setup();
  s.profile.startDate = date;
  s.contests = [{ ...s.contests![0]!, examDate: "2027-01-24" }];
  expect(planOutline(s, date)).toMatchObject({
    scenario: "standard",
    daysRemaining: 90,
    phases: [
      { kind: "foundation", days: 28 },
      { kind: "consolidation", days: 23 },
      { kind: "final", days: 9 },
      { kind: "eve_review", days: null },
      { kind: "legislation", days: null },
      { kind: "judgments", days: null },
      { kind: "mock", days: null },
    ],
  });
  s.contests[0]!.examDate = "2026-12-10";
  expect(planOutline(s, date).phases).toEqual([
    expect.objectContaining({ kind: "foundation", days: 10 }),
    expect.objectContaining({ kind: "final", days: 5 }),
    expect.objectContaining({ kind: "eve_review", days: null }),
    expect.objectContaining({ kind: "legislation", days: null }),
    expect.objectContaining({ kind: "judgments", days: null }),
    expect.objectContaining({ kind: "mock", days: null }),
  ]);
  s.contests[0]!.examDate = "2027-03-15";
  expect(planOutline(s, date)).toMatchObject({
    scenario: "long",
    phases: [
      { kind: "base", days: 20 },
      { kind: "foundation", days: 42 },
      { kind: "consolidation", days: 35 },
      { kind: "final", days: 13 },
      { kind: "eve_review", days: null },
      { kind: "legislation", days: null },
      { kind: "judgments", days: null },
      { kind: "mock", days: null },
    ],
  });
});

it("gera seis dias de blocos de 30 minutos com principal e encaixe", () => {
  const s = setup();
  s.profile.hours = 2;
  s.subjects[0]!.domain = 0;
  s.subjects[1]!.domain = 5;
  s.subjects[2]!.domain = 4;

  const week = studyWeek(s, "2026-10-24");

  expect(week).toHaveLength(6);
  expect(week.map((day) => day.date)).not.toContain("2026-10-25");
  expect(week.every((day) => day.blocks.length === 4)).toBe(true);
  expect(
    week.flatMap((day) => day.blocks).every((block) => block.minutes === 30),
  ).toBe(true);
  expect(
    week[0]!.blocks.slice(0, 3).every((block) => block.role === "main"),
  ).toBe(true);
  expect(week[0]!.blocks[0]!.subject.id).toBe(s.subjects[0]!.id);
  expect(week[0]!.blocks.at(-1)).toMatchObject({
    role: "fitting",
    subject: { id: s.subjects[1]!.id },
  });
});

it("respeita a data de início e não cria blocos depois da prova", () => {
  const s = setup();
  for (const subject of s.subjects) subject.domain = 0;
  s.profile.startDate = "2026-10-30";
  s.contests = [{ ...s.contests![0]!, examDate: "2026-11-02" }];

  const week = studyWeek(s, "2026-10-24");

  expect(week[0]!.date).toBe("2026-10-30");
  expect(week.at(-1)!.date).toBe("2026-11-02");
  expect(week.every((day) => day.date <= "2026-11-02")).toBe(true);
});

it("não intercala matéria de encaixe na rota urgente", () => {
  const s = setup();
  for (const subject of s.subjects) subject.domain = 0;
  s.contests = [{ ...s.contests![0]!, examDate: "2026-11-02" }];

  expect(
    studyWeek(s, date)
      .flatMap((day) => day.blocks)
      .every((block) => block.role === "main"),
  ).toBe(true);
});

it("reavalia o cenário em cada dia quando a semana cruza D-30", () => {
  const s = setup();
  for (const subject of s.subjects) subject.domain = 0;
  s.profile.startDate = date;
  s.contests = [{ ...s.contests![0]!, examDate: "2026-11-28" }];

  const week = studyWeek(s, date);
  const beforeUrgent = week.find((day) => day.date === "2026-10-28")!;
  const urgent = week.find((day) => day.date === "2026-10-29")!;

  expect(planStage(s, beforeUrgent.date)).toBe("final");
  expect(beforeUrgent.blocks[0]!.topic.kind).toBe("eve_review");
  expect(planStage(s, urgent.date)).toBe("eve_review");
  expect(urgent.blocks[0]!.topic.kind).toBe("eve_review");
});

it("mostra o simulado na rota urgente e encerra os blocos após registrá-lo", () => {
  const s = setup();
  for (const subject of s.subjects) {
    subject.domain = 0;
    for (const topic of subject.topics) topic.read = true;
  }
  s.contests = [{ ...s.contests![0]!, examDate: "2026-11-02" }];

  let week = studyWeek(s, date);
  expect(week[0]!.blocks).toEqual([
    expect.objectContaining({
      sessionKind: "mock",
      label: "Simulado completo",
    }),
  ]);

  s.sessions.push({
    id: crypto.randomUUID(),
    subjectId: s.subjects[0]!.id,
    topicId: s.subjects[0]!.topics[0]!.id,
    kind: "mock",
    date,
    minutes: 120,
    recall: "",
    questions: 100,
    correct: 70,
  });
  week = studyWeek(s, date);
  expect(week.every((day) => day.blocks.length === 0)).toBe(true);
});

it("a fase de consolidação gera ciclo ativo quando a leitura terminou", () => {
  const s = setup();
  for (const subject of s.subjects) {
    subject.domain = 0;
    for (const topic of subject.topics)
      if (topic.kind === "regular") topic.read = true;
  }
  s.profile.startDate = "2026-09-01";
  s.contests = [{ ...s.contests![0]!, examDate: "2026-12-30" }];

  expect(planStage(s, date)).toBe("consolidation");
  expect(studyWeek(s, date)[0]!.blocks[0]!.sessionKind).toBe("active");
});

it("preserva as fases da rota curta antes de entrar na urgência", () => {
  const s = setup();
  for (const subject of s.subjects) subject.domain = 0;
  s.profile.startDate = "2026-10-26";
  s.contests = [{ ...s.contests![0]!, examDate: "2026-12-10" }];

  expect(planStage(s, "2026-11-05")).toBe("final");
  expect(planStage(s, "2026-11-09")).toBe("final");
  expect(planStage(s, "2026-11-10")).toBe("eve_review");
});

it("preserva consolidação e reta final da rota padrão antes da urgência", () => {
  const s = setup();
  for (const subject of s.subjects) subject.domain = 0;
  s.profile.startDate = "2026-10-26";
  s.contests = [{ ...s.contests![0]!, examDate: "2027-01-24" }];

  expect(planStage(s, "2026-11-25")).toBe("consolidation");
  expect(planStage(s, "2026-12-20")).toBe("final");
  expect(planStage(s, "2026-12-25")).toBe("eve_review");
  const urgentOutline = planOutline(s, "2026-12-25");
  expect(urgentOutline.scenario).toBe("urgent");
  expect(urgentOutline.phases.map((item) => item.kind)).toEqual([
    "foundation",
    "consolidation",
    "final",
    "eve_review",
    "legislation",
    "judgments",
    "mock",
  ]);
});
