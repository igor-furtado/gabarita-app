import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { disciplinasIniciais, topicosIniciais } from '@/mocks/data'
import { useConcursosStore } from '@/stores/concursos'
import type { Disciplina, Topico } from '@/types/domain'

export const useDisciplinasStore = defineStore('disciplinas', () => {
  const disciplinas = ref<Disciplina[]>(structuredClone(disciplinasIniciais))
  const topicos = ref<Topico[]>(structuredClone(topicosIniciais))
  const ordenadas = computed(() => [...disciplinas.value].sort((a, b) => a.ordem - b.ordem))

  function adicionarDisciplina(dados: Omit<Disciplina, 'id'>) {
    disciplinas.value.push({ ...dados, id: crypto.randomUUID() })
  }
  function editarDisciplina(id: string, dados: Omit<Disciplina, 'id'>) {
    const indice = disciplinas.value.findIndex((item) => item.id === id)
    if (indice >= 0) disciplinas.value[indice] = { ...dados, id }
  }
  function excluirDisciplina(id: string) {
    topicos.value = topicos.value.filter((item) => item.disciplinaId !== id)
    disciplinas.value = disciplinas.value.filter((item) => item.id !== id)
  }
  function validarRelacoesDoTopico(dados: Omit<Topico, 'id'>) {
    if (!disciplinas.value.some((item) => item.id === dados.disciplinaId))
      throw new Error('Disciplina não encontrada.')
    if (!useConcursosStore().perfis.some((item) => item.id === dados.perfilId))
      throw new Error('Perfil não encontrado.')
  }
  function adicionarTopico(dados: Omit<Topico, 'id'>) {
    validarRelacoesDoTopico(dados)
    topicos.value.push({ ...dados, id: crypto.randomUUID() })
  }
  function editarTopico(id: string, dados: Omit<Topico, 'id'>) {
    validarRelacoesDoTopico(dados)
    const indice = topicos.value.findIndex((item) => item.id === id)
    if (indice >= 0) topicos.value[indice] = { ...dados, id }
  }
  function excluirTopico(id: string) {
    topicos.value = topicos.value.filter((item) => item.id !== id)
  }
  function excluirTopicosDosPerfis(perfilIds: string[]) {
    topicos.value = topicos.value.filter((item) => !perfilIds.includes(item.perfilId))
  }
  function alternarConclusao(id: string) {
    const topico = topicos.value.find((item) => item.id === id)
    if (topico) topico.concluido = !topico.concluido
  }
  return {
    disciplinas,
    topicos,
    ordenadas,
    adicionarDisciplina,
    editarDisciplina,
    excluirDisciplina,
    adicionarTopico,
    editarTopico,
    excluirTopico,
    excluirTopicosDosPerfis,
    alternarConclusao,
  }
})
