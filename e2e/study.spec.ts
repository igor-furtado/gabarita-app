import { test, expect } from "@playwright/test";
import "dotenv/config";
import postgres from "postgres";
const ownedNames: string[] = [];
test.afterAll(async () => {
  const sql = postgres(process.env.DATABASE_URL!);
  try {
    for (const name of ownedNames) {
      await sql.begin(async (tx) => {
        await tx`select id from workspaces where id=1 for update`;
        const removed =
          await tx`delete from subjects using study_plans p where subjects.plan_id=p.id and p.workspace_id=1 and subjects.name=${name} returning subjects.id`;
        if (removed.length)
          await tx`update workspaces set version=version+1 where id=1`;
      });
    }
  } finally {
    await sql.end();
  }
});
test("matéria, tópico e primeira leitura persistem após recarregar", async ({
  page,
}) => {
  await page.goto("/materias");
  await page.getByRole("button", { name: "Nova matéria" }).click();
  const dialog = page.getByRole("dialog");
  const name = `Matéria de teste ${Date.now()}`;
  ownedNames.push(name);
  await dialog.getByLabel("Nome", { exact: true }).fill(name);
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  const card = page.locator("article").filter({
    has: page.getByRole("button", { name: `Editar ${name}`, exact: true }),
  });
  const domain = card.getByLabel(`Domínio de ${name}`);
  await expect(domain).toHaveValue("");
  await domain.selectOption("0");
  await card.getByRole("button", { name: "Ver tópicos (1)" }).click();
  await expect(dialog.getByText("tópico fixo")).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Revisão de Véspera", exact: true }),
  ).toHaveCount(0);
  await dialog.getByRole("button", { name: "Adicionar tópicos" }).click();
  await dialog
    .getByLabel("Tópicos (um por linha)", { exact: true })
    .fill("Primeiro tópico\nSegundo tópico");
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await card.getByRole("button", { name: "Ver tópicos (3)" }).click();
  await dialog
    .getByRole("button", { name: "Reposicionar Segundo tópico" })
    .dragTo(dialog.locator(".topic-manager-list li").first());
  await expect(dialog.locator(".topic-manager-name")).toHaveText([
    "Segundo tópico",
    "Primeiro tópico",
    "Revisão de Véspera tópico fixo",
  ]);
  await dialog.getByRole("button", { name: "Fechar", exact: true }).click();
  await card.getByRole("button", { name: "Estudar", exact: true }).click();
  await expect(dialog.getByLabel("Tópico")).not.toHaveValue("");
  await dialog
    .getByRole("button", { name: "Concluir e salvar sessão" })
    .click();
  await expect(dialog).not.toBeVisible();
  await card.getByRole("button", { name: "Estudar", exact: true }).click();
  await dialog.getByLabel("Tópico").selectOption({ label: "Primeiro tópico" });
  await dialog
    .getByRole("button", { name: "Concluir e salvar sessão" })
    .click();
  await expect(dialog).not.toBeVisible();
  await page.reload();
  await expect(domain).toHaveValue("0");
  await expect(card).toContainText("2 de 2 tópicos lidos");
  await card.getByRole("button", { name: "Estudar", exact: true }).click();
  await dialog.getByLabel("Tipo de sessão").selectOption("active");
  await dialog
    .getByLabel("Cinco linhas de memória")
    .fill(
      "Primeira regra\nSegunda regra\nTerceira regra\nQuarta regra\nQuinta regra",
    );
  await dialog.getByLabel("Questões", { exact: true }).fill("20");
  await dialog.getByLabel("Acertos", { exact: true }).fill("17");
  await dialog
    .getByRole("button", { name: "Concluir e salvar sessão" })
    .click();
  await expect(dialog).not.toBeVisible();
  await page.goto("/revisoes");
  const reviews = page.locator(".review-row").filter({ hasText: name });
  await expect(reviews).toHaveCount(3);
  await expect(reviews.filter({ hasText: "D+30" })).toHaveCount(1);
});
test("plano orienta a configuração antes de montar o calendário", async ({
  page,
}) => {
  await page.goto("/plano");
  await expect(
    page.getByRole("heading", { name: "Complete sua configuração." }),
  ).toBeVisible();
  const onboarding = page.locator(".onboarding-steps");
  await expect(
    onboarding.getByRole("link", { name: "Meu planejamento" }),
  ).toBeVisible();
  await expect(
    onboarding.getByRole("link", { name: "Meus concursos" }),
  ).toBeVisible();
});
test("layout móvel não transborda e menu navega", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Abrir menu" }).click();
  await page.getByRole("link", { name: "Caderno de erros" }).click();
  await expect(
    page.getByRole("heading", { name: "Seu caderno de erros." }),
  ).toBeVisible();
});
test("exclui uma matéria pela janela de edição", async ({ page }) => {
  await page.goto("/materias");
  await page.getByRole("button", { name: "Nova matéria" }).click();
  const dialog = page.getByRole("dialog");
  const name = `Matéria para excluir ${Date.now()}`;
  ownedNames.push(name);
  await dialog.getByLabel("Nome", { exact: true }).fill(name);
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  const card = page.locator("article").filter({ hasText: name });
  await card.getByRole("button", { name: `Editar ${name}` }).click();
  await dialog.getByRole("button", { name: "Excluir matéria" }).click();
  await expect(dialog).toContainText(`Excluir “${name}”?`);
  await dialog.getByRole("button", { name: "Excluir definitivamente" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(card).toHaveCount(0);
});
test("exclui um tópico pela janela de edição", async ({ page }) => {
  await page.goto("/materias");
  await page.getByRole("button", { name: "Nova matéria" }).click();
  const dialog = page.getByRole("dialog");
  const name = `Matéria com tópico excluído ${Date.now()}`;
  ownedNames.push(name);
  await dialog.getByLabel("Nome", { exact: true }).fill(name);
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  const card = page.locator("article").filter({ hasText: name });
  await card.getByRole("button", { name: "Ver tópicos (1)" }).click();
  await dialog.getByRole("button", { name: "Adicionar tópicos" }).click();
  await dialog
    .getByLabel("Tópicos (um por linha)", { exact: true })
    .fill("Primeiro tópico\nSegundo tópico");
  await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
  await card.getByRole("button", { name: "Ver tópicos (3)" }).click();
  await dialog
    .getByRole("button", { name: "Primeiro tópico", exact: true })
    .click();
  await dialog.getByRole("button", { name: "Excluir tópico" }).click();
  await expect(dialog).toContainText("Excluir “Primeiro tópico”?");
  await dialog.getByRole("button", { name: "Excluir definitivamente" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(
    card.getByRole("button", { name: "Ver tópicos (2)" }),
  ).toBeVisible();
  await card.getByRole("button", { name: "Ver tópicos (2)" }).click();
  await expect(dialog.locator(".topic-manager-name")).toContainText([
    "Segundo tópico",
    "Revisão de Véspera",
  ]);
});
