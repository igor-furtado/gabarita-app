import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCalendarioStore } from './calendario'
import { useConcursosStore } from './concursos'
import { useDisciplinasStore } from './disciplinas'
import { useOrganizacaoStore } from './organizacao'

describe('integridade da organização', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('exclui um concurso e todos os seus relacionamentos', () => {
    const organizacao = useOrganizacaoStore()
    const concursos = useConcursosStore()
    const disciplinas = useDisciplinasStore()
    const calendario = useCalendarioStore()
    const editalIds = concursos.editais
      .filter((edital) => edital.orgaoId === 'trt7')
      .map((edital) => edital.id)
    const perfilIds = concursos.perfis
      .filter((perfil) => editalIds.includes(perfil.editalId))
      .map((perfil) => perfil.id)

    organizacao.excluirConcurso('trt7')

    expect(concursos.orgaos.some((orgao) => orgao.id === 'trt7')).toBe(false)
    expect(concursos.editais.some((edital) => editalIds.includes(edital.id))).toBe(false)
    expect(concursos.perfis.some((perfil) => perfilIds.includes(perfil.id))).toBe(false)
    expect(disciplinas.topicos.some((topico) => perfilIds.includes(topico.perfilId))).toBe(false)
    expect(calendario.eventos.some((evento) => editalIds.includes(evento.editalId))).toBe(false)
  })

  it('rejeita tópico sem perfil existente', () => {
    const disciplinas = useDisciplinasStore()

    expect(() =>
      disciplinas.adicionarTopico({
        disciplinaId: 'portugues',
        perfilId: 'perfil-inexistente',
        titulo: 'Interpretação de texto',
        pesoProva: 2,
        questoesCertas: 0,
        questoesErradas: 0,
        concluido: false,
        ordem: 1,
      }),
    ).toThrow('Perfil não encontrado')
  })
})
