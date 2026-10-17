import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { cargosIniciais, editaisIniciais, orgaosIniciais, perfisIniciais } from '@/mocks/data'
import type { Edital, NovoCargo, NovoEdital, NovoOrgao, NovoPerfil, Orgao } from '@/types/domain'

export const useConcursosStore = defineStore('concursos', () => {
  const orgaos = ref<Orgao[]>(structuredClone(orgaosIniciais))
  const editais = ref<Edital[]>(structuredClone(editaisIniciais))
  const cargos = ref(structuredClone(cargosIniciais))
  const perfis = ref(structuredClone(perfisIniciais))

  const concursos = computed(() =>
    orgaos.value.map((orgao) => ({
      orgao,
      edital: editais.value.find((item) => item.orgaoId === orgao.id),
    })),
  )

  function criarOrgao(dados: NovoOrgao) {
    const orgao = { ...dados, id: crypto.randomUUID() }
    orgaos.value.unshift(orgao)
    return orgao
  }

  function editarOrgao(id: string, dados: NovoOrgao) {
    const indice = orgaos.value.findIndex((item) => item.id === id)
    if (indice < 0) return false
    orgaos.value[indice] = { ...dados, id }
    return true
  }

  function excluirOrgao(id: string) {
    const editalIds = editais.value.filter((item) => item.orgaoId === id).map((item) => item.id)
    perfis.value = perfis.value.filter((item) => !editalIds.includes(item.editalId))
    editais.value = editais.value.filter((item) => item.orgaoId !== id)
    orgaos.value = orgaos.value.filter((item) => item.id !== id)
  }

  function adicionarEdital(orgaoId: string, dados: NovoEdital) {
    if (!orgaos.value.some((item) => item.id === orgaoId)) throw new Error('Órgão não encontrado.')
    if (editais.value.some((item) => item.orgaoId === orgaoId))
      throw new Error('Este órgão já possui um edital.')
    const edital = { ...dados, id: crypto.randomUUID(), orgaoId }
    editais.value.push(edital)
    return edital
  }

  function editarEdital(id: string, dados: NovoEdital) {
    const indice = editais.value.findIndex((item) => item.id === id)
    if (indice < 0) return false
    const atual = editais.value[indice]
    editais.value[indice] = { ...dados, id, orgaoId: atual.orgaoId }
    return true
  }

  function excluirEdital(id: string) {
    perfis.value = perfis.value.filter((item) => item.editalId !== id)
    editais.value = editais.value.filter((item) => item.id !== id)
  }

  function adicionarCargo(dados: NovoCargo) {
    const cargo = { ...dados, id: crypto.randomUUID() }
    cargos.value.push(cargo)
    return cargo
  }

  function editarCargo(id: string, dados: NovoCargo) {
    const indice = cargos.value.findIndex((item) => item.id === id)
    if (indice < 0) return false
    cargos.value[indice] = { ...dados, id }
    return true
  }

  function excluirCargo(id: string) {
    perfis.value = perfis.value.filter((item) => item.cargoId !== id)
    cargos.value = cargos.value.filter((item) => item.id !== id)
  }

  function adicionarPerfil(dados: NovoPerfil) {
    if (!editais.value.some((item) => item.id === dados.editalId))
      throw new Error('Edital não encontrado.')
    if (!cargos.value.some((item) => item.id === dados.cargoId))
      throw new Error('Cargo não encontrado.')
    const perfil = { ...dados, id: crypto.randomUUID() }
    perfis.value.push(perfil)
    return perfil
  }

  function editarPerfil(id: string, dados: NovoPerfil) {
    if (!editais.value.some((item) => item.id === dados.editalId))
      throw new Error('Edital não encontrado.')
    if (!cargos.value.some((item) => item.id === dados.cargoId))
      throw new Error('Cargo não encontrado.')
    const indice = perfis.value.findIndex((item) => item.id === id)
    if (indice < 0) return false
    perfis.value[indice] = { ...dados, id }
    return true
  }

  function excluirPerfil(id: string) {
    perfis.value = perfis.value.filter((item) => item.id !== id)
  }

  return {
    orgaos,
    editais,
    cargos,
    perfis,
    concursos,
    criarOrgao,
    editarOrgao,
    excluirOrgao,
    adicionarEdital,
    editarEdital,
    excluirEdital,
    adicionarCargo,
    editarCargo,
    excluirCargo,
    adicionarPerfil,
    editarPerfil,
    excluirPerfil,
  }
})
