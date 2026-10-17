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
    concursos.perfis = concursos.perfis.filter((perfil) => !perfilIds.includes(perfil.id))
    concursos.editais = concursos.editais.filter((edital) => edital.id !== editalId)
  }

  function excluirConcurso(orgaoId: string) {
    const editalIds = concursos.editais
      .filter((edital) => edital.orgaoId === orgaoId)
      .map((edital) => edital.id)

    for (const editalId of editalIds) excluirEdital(editalId)
    concursos.orgaos = concursos.orgaos.filter((orgao) => orgao.id !== orgaoId)
  }

  function excluirCargo(cargoId: string) {
    const perfilIds = concursos.perfis
      .filter((perfil) => perfil.cargoId === cargoId)
      .map((perfil) => perfil.id)

    disciplinas.excluirTopicosDosPerfis(perfilIds)
    concursos.perfis = concursos.perfis.filter((perfil) => !perfilIds.includes(perfil.id))
    concursos.cargos = concursos.cargos.filter((cargo) => cargo.id !== cargoId)
  }

  function excluirPerfil(perfilId: string) {
    disciplinas.excluirTopicosDosPerfis([perfilId])
    concursos.perfis = concursos.perfis.filter((perfil) => perfil.id !== perfilId)
  }

  return { excluirCargo, excluirConcurso, excluirEdital, excluirPerfil }
})
