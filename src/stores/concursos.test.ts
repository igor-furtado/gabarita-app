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

  it('inclui, edita e exclui um perfil válido', () => {
    const store = useConcursosStore()
    const dados = {
      editalId: 'edital-1',
      cargoId: 'analista',
      remuneracao: 9_000,
      vagasAmpla: 2,
      vagasCadastroReserva: 4,
      cargaHoraria: 40,
      municipioLotacao: 'Fortaleza',
      ufLotacao: 'CE',
    }

    const perfil = store.adicionarPerfil(dados)
    expect(store.perfis).toContainEqual(perfil)
    expect(store.editarPerfil(perfil.id, { ...dados, remuneracao: 10_000 })).toBe(true)
    expect(store.perfis.find((item) => item.id === perfil.id)?.remuneracao).toBe(10_000)

    store.excluirPerfil(perfil.id)
    expect(store.perfis.some((item) => item.id === perfil.id)).toBe(false)
  })
})
