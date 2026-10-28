import { test, expect } from "@playwright/test";
import "dotenv/config";
import postgres from "postgres";
import { addDays, today, type State, type Command } from "../server/domain";
const prefix = `Edital E2E ${Date.now()}`;
test.afterAll(async () => {
  const sql = postgres(process.env.DATABASE_URL!);
  try {
    await sql.begin(async (tx) => {
      await tx`select id from workspaces where id=1 for update`;
      await tx`delete from contests using study_plans p where contests.plan_id=p.id and p.workspace_id=1 and contests.name like ${prefix + "%"}`;
      await tx`delete from subjects using study_plans p where subjects.plan_id=p.id and p.workspace_id=1 and subjects.name=${prefix}`;
      await tx`update workspaces set version=version+1 where id=1`;
    });
  } finally {
    await sql.end();
  }
});
test("dois editais compartilham progresso e edição persiste no desktop e celular", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const send = async (command: Command) => {
    const current = await (await page.request.get("/api/state")).json();
    const response = await page.request.post("/api/commands", {
      data: { version: current.version, command },
    });
    expect(response.ok()).toBe(true);
    return (await response.json()).data as State;
  };
  let state = await send({ type: "subject", name: prefix });
  const subject = state.subjects.find((s) => s.name === prefix)!;
  await send({ type: "domain", id: subject.id, domain: 0 });
  state = await send({
    type: "topic",
    subjectId: subject.id,
    name: "Conteúdo comum",
  });
  const topic = state.subjects.find((s) => s.id === subject.id)!.topics[0]!;
  await send({
    type: "topic",
    subjectId: subject.id,
    name: "Conteúdo exclusivo",
  });
  await page.goto("/concursos");
  for (const [index, name] of [`${prefix} A`, `${prefix} B`].entries()) {
    await page.getByRole("button", { name: "Adicionar concurso" }).click();
    await page.getByLabel("Nome do concurso ou órgão").fill(name);
    if (index === 0) {
      await page.getByLabel("Cargo opcional").fill("Auditor fiscal");
      await page.getByLabel("Quantidade de vagas opcional").fill("12");
      await page.getByLabel("Salário opcional").fill("18500.5");
      await page
        .getByLabel("Nível de escolaridade opcional")
        .selectOption("superior");
    }
    await page
      .getByLabel("Data da prova")
      .fill(addDays(today(), 30 + index * 90));
    await page.getByLabel("Buscar no acervo").fill(prefix);
    await page.getByRole("checkbox", { name: prefix }).check();
    await expect(page.getByLabel("Peso no edital")).toHaveValue("1");
    await page.getByLabel("Peso no edital").fill("10");
    const controlHeights = await page
      .locator(".contest-scope")
      .evaluate((scope) => ({
        weight: scope.querySelector("input")?.getBoundingClientRect().height,
        coverage: scope.querySelector("select")?.getBoundingClientRect().height,
      }));
    expect(controlHeights.weight).toBe(controlHeights.coverage);
    await expect(
      page.getByText(
        "Inclui os tópicos atuais e os que você adicionar a esta matéria depois.",
      ),
    ).toHaveCount(0);
    await page
      .getByLabel("Abrangência")
      .selectOption({ label: "Selecionar tópicos" });
    await page
      .getByRole("checkbox", { name: "Conteúdo comum", exact: true })
      .check();
    await page
      .getByRole("button", { name: "Salvar concurso e edital" })
      .click();
    await expect(page.locator(".contest-editor")).not.toBeVisible();
  }
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
  await page.reload();
  for (const name of [`${prefix} A`, `${prefix} B`]) {
    const card = page
      .locator(".contest-card")
      .filter({ has: page.getByRole("heading", { name, exact: true }) });
    await expect(card).toContainText("1 de 1 tópicos lidos");
  }
  const detailed = page
    .locator(".contest-card")
    .filter({ hasText: `${prefix} A` });
  await expect(detailed).toContainText("Auditor fiscal");
  await expect(detailed).toContainText("12 vagas");
  await expect(detailed).toContainText("R$ 18.500,50");
  await expect(detailed).toContainText("Nível superior");
  const card = page.locator(".contest-card").filter({
    has: page.getByRole("heading", { name: `${prefix} A`, exact: true }),
  });
  await card.getByRole("button", { name: "Editar edital" }).click();
  await page.getByLabel("Peso no edital").fill("8");
  await page.getByRole("button", { name: "Salvar concurso e edital" }).click();
  await expect(card).toContainText("peso 8");
  await page.screenshot({
    path: "output/concursos-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await card.getByRole("button", { name: "Editar edital" }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "output/concursos-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await card.getByRole("button", { name: "Arquivar", exact: true }).click();
  await expect(card).not.toBeVisible();
  await page.getByLabel("Mostrar concursos arquivados").check();
  await expect(card).toContainText("ARQUIVADO");
  await card.getByRole("button", { name: "Reativar" }).click();
  await expect(card).not.toContainText("ARQUIVADO");
  expect(errors).toEqual([]);
});
