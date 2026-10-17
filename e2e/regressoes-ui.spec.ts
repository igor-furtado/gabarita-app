import { expect, test } from '@playwright/test'

test('mantém a navegação lateral fixa durante o scroll', async ({ page }) => {
  await page.goto('/concursos')
  const sidebar = page.locator('aside')
  const painel = page.locator('aside + div')
  const antes = await sidebar.boundingBox()

  await page.mouse.move(1_000, 500)
  await page.mouse.wheel(0, 2_000)
  await page.waitForTimeout(100)
  const depois = await sidebar.boundingBox()

  expect(antes?.y).toBe(0)
  expect(depois?.y).toBe(0)
  expect(await page.evaluate<number>('window.scrollY')).toBe(0)
  expect(await painel.evaluate((element) => element.scrollTop)).toBeGreaterThan(0)

  await page.mouse.wheel(0, -4_000)
  expect(await page.evaluate<number>('window.scrollY')).toBe(0)
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0)
})

test('não expõe código no cabeçalho da tabela', async ({ page }) => {
  await page.goto('/concursos')
  const cabecalho = page.locator('thead')

  await expect(cabecalho).toContainText('Órgão')
  await expect(cabecalho).toContainText('Banca')
  await expect(cabecalho).not.toContainText('props')
  await expect(cabecalho).not.toContainText('columnDef')
})

test('mostra feedback temporizado depois de adicionar um concurso', async ({ page }) => {
  await page.goto('/concursos')
  await page.getByRole('button', { name: 'Novo concurso' }).click()
  await page.getByLabel('Sigla').fill('STM')
  await page.getByLabel('Nome do órgão').fill('Superior Tribunal Militar')
  await page.getByLabel('Município sede').fill('Brasília')
  await page.getByLabel('UF sede').fill('DF')
  await page.getByRole('button', { name: 'Criar concurso' }).click()

  const alerta = page.getByRole('alert')
  await expect(alerta).toContainText('STM foi adicionado')
  await expect(alerta.getByRole('progressbar')).toBeVisible()
  await expect(alerta).toBeHidden({ timeout: 7_000 })
})

test('mostra feedback ao excluir um concurso', async ({ page }) => {
  await page.goto('/concursos/tjce')
  await page.getByRole('button', { name: 'Excluir concurso' }).click()
  await page.getByRole('button', { name: 'Excluir', exact: true }).click()

  await expect(page).toHaveURL(/\/concursos$/)
  await expect(page.getByRole('alert')).toContainText('TJCE foi excluído')
})

test('mostra feedback ao adicionar e excluir uma disciplina', async ({ page }) => {
  await page.goto('/disciplinas')
  await page.getByRole('button', { name: 'Nova disciplina' }).click()
  await page.getByLabel('Nome', { exact: true }).fill('Ética no serviço público')
  await page.getByRole('button', { name: 'Adicionar', exact: true }).click()

  await expect(page.getByRole('alert')).toContainText('Ética no serviço público foi adicionada')
  await page.getByRole('button', { name: 'Fechar alerta' }).click()
  await page.getByRole('button', { name: /Ética no serviço público/ }).click()
  await page.getByRole('button', { name: 'Excluir', exact: true }).click()
  await page.getByRole('button', { name: 'Excluir', exact: true }).click()

  await expect(page.getByRole('alert')).toContainText('Ética no serviço público foi excluída')
})

test('mostra feedback ao adicionar e excluir um evento', async ({ page }) => {
  await page.goto('/calendario')
  await page.getByRole('button', { name: 'Novo evento' }).click()
  await page.getByLabel('Data').fill('2026-12-20')
  await page.getByRole('button', { name: 'Adicionar', exact: true }).click()

  await expect(page.getByRole('alert')).toContainText('Evento adicionado ao calendário')
  await page.getByRole('button', { name: 'Fechar alerta' }).click()
  const evento = page.locator('article').filter({ hasText: '20/12/2026' })
  await evento.getByRole('button', { name: 'Excluir evento' }).click()
  await page.getByRole('button', { name: 'Excluir', exact: true }).click()

  await expect(page.getByRole('alert')).toContainText('Evento excluído do calendário')
})
