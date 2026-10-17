import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useConcursosStore } from './concursos'

describe('organização de concursos', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('cria um órgão sem persistir fora da store', () => {
    const store = useConcursosStore()
    const totalInicial = store.orgaos.length
    const criado = store.criarOrgao({
      sigla: 'ALECE',
      nome: 'Assembleia Legislativa do Ceará',
      atuacao: 'estadual',
      municipioSede: 'Fortaleza',
      ufSede: 'CE',
    })
    expect(store.orgaos).toHaveLength(totalInicial + 1)
    expect(store.orgaos[0]).toEqual(criado)
  })

  it('impede mais de um edital por órgão', () => {
    const store = useConcursosStore()
    expect(() =>
      store.adicionarEdital('trt7', {
        titulo: 'Outro',
        numero: '2',
        banca: 'FGV',
        situacao: 'previsto',
        dataPublicacao: '2026-10-01',
        urlDocumento: 'https://exemplo.org',
        observacoes: '',
      }),
    ).toThrow('já possui um edital')
  })

  it('remove vínculos ao excluir um concurso', () => {
    const store = useConcursosStore()
    const edital = store.editais.find((item) => item.orgaoId === 'trt7')
    store.excluirOrgao('trt7')
    expect(store.orgaos.some((item) => item.id === 'trt7')).toBe(false)
    expect(store.editais.some((item) => item.orgaoId === 'trt7')).toBe(false)
    expect(store.perfis.some((item) => item.editalId === edital?.id)).toBe(false)
  })
})
