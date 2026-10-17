import { defineStore } from 'pinia'
import { useCalendarioStore } from '@/stores/calendario'
import { useConcursosStore } from '@/stores/concursos'
import { useDisciplinasStore } from '@/stores/disciplinas'

export const useOrganizacaoStore = defineStore('organizacao', () => {
  const concursos = useConcursosStore()
  const disciplinas = useDisciplinasStore()
  const calendario = useCalendarioStore()

  function excluirEdital(editalId: string) {
    const perfilIds = concursos.perfis
      .filter((perfil) => perfil.editalId === editalId)
      .map((perfil) => perfil.id)

    disciplinas.excluirTopicosDosPerfis(perfilIds)
    calendario.excluirEventosDoEdital(editalId)
    for (const perfilId of perfilIds) concursos.excluirPerfil(perfilId)
    concursos.excluirEdital(editalId)
  }

  function excluirConcurso(orgaoId: string) {
    const editalIds = concursos.editais
      .filter((edital) => edital.orgaoId === orgaoId)
      .map((edital) => edital.id)

    for (const editalId of editalIds) excluirEdital(editalId)
    concursos.excluirOrgao(orgaoId)
  }

  function excluirCargo(cargoId: string) {
    const perfilIds = concursos.perfis
      .filter((perfil) => perfil.cargoId === cargoId)
      .map((perfil) => perfil.id)

    disciplinas.excluirTopicosDosPerfis(perfilIds)
    for (const perfilId of perfilIds) concursos.excluirPerfil(perfilId)
    concursos.excluirCargo(cargoId)
  }

  function excluirPerfil(perfilId: string) {
    disciplinas.excluirTopicosDosPerfis([perfilId])
    concursos.excluirPerfil(perfilId)
  }

  return { excluirCargo, excluirConcurso, excluirEdital, excluirPerfil }
})
