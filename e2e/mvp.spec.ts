import { expect, test } from '@playwright/test'

test('fluxo principal do MVP funciona sem erros visíveis', async ({ page }) => {
  const erros: string[] = []
  page.on('pageerror', (error) => erros.push(error.message))
  await page.goto('/')
  await expect(page).toHaveURL(/\/concursos$/)
  await expect(page.getByRole('heading', { name: 'Concursos' })).toBeVisible()

  await page.getByRole('button', { name: 'Novo concurso' }).click()
  await page.getByLabel('Sigla').fill('ALECE')
  await page.getByLabel('Nome do órgão').fill('Assembleia Legislativa do Ceará')
  await page.getByLabel('Município sede').fill('Fortaleza')
  await page.getByLabel('UF sede').fill('CE')
  await page.getByRole('button', { name: 'Criar concurso' }).click()
  await expect(page.getByText('ALECE foi adicionado.')).toBeVisible()

  await page.getByRole('cell', { name: 'ALECE' }).click()
  await expect(page.getByRole('heading', { name: 'ALECE' })).toBeVisible()
  await page.getByRole('button', { name: 'Adicionar edital' }).click()
  await page.getByLabel('Título').fill('Concurso ALECE 2026')
  await page.getByLabel('Número').fill('01/2026')
  await page.getByLabel('Banca', { exact: true }).fill('Cebraspe')
  await page.getByLabel('Publicação').fill('2026-10-17')
  await page.getByLabel('URL do documento').fill('https://exemplo.org/alece')
  await page.getByRole('button', { name: 'Salvar edital' }).click()
  await expect(page.getByRole('heading', { name: 'Concurso ALECE 2026' })).toBeVisible()

  await page.getByRole('link', { name: 'Disciplinas' }).first().click()
  await expect(page.getByRole('heading', { name: 'Disciplinas e tópicos' })).toBeVisible()
  await page.getByRole('link', { name: 'Calendário' }).first().click()
  await expect(page.getByRole('heading', { name: 'Calendário' })).toBeVisible()
  expect(erros).toEqual([])
})
