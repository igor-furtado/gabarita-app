import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { eventosIniciais } from '@/mocks/data'
import { useConcursosStore } from '@/stores/concursos'
import type { EventoCalendario } from '@/types/domain'

export const useCalendarioStore = defineStore('calendario', () => {
  const eventos = ref<EventoCalendario[]>(structuredClone(eventosIniciais))
  const ordenados = computed(() => [...eventos.value].sort((a, b) => a.data.localeCompare(b.data)))
  function adicionarEvento(dados: Omit<EventoCalendario, 'id'>) {
    if (!useConcursosStore().editais.some((item) => item.id === dados.editalId)) {
      throw new Error('O evento precisa estar vinculado a um edital existente.')
    }
    eventos.value.push({ ...dados, id: crypto.randomUUID() })
  }
  function editarEvento(id: string, dados: Omit<EventoCalendario, 'id'>) {
    if (!useConcursosStore().editais.some((item) => item.id === dados.editalId)) {
      throw new Error('O evento precisa estar vinculado a um edital existente.')
    }
    const indice = eventos.value.findIndex((item) => item.id === id)
    if (indice >= 0) eventos.value[indice] = { ...dados, id }
  }
  function excluirEvento(id: string) {
    eventos.value = eventos.value.filter((item) => item.id !== id)
  }
  function excluirEventosDoEdital(editalId: string) {
    eventos.value = eventos.value.filter((item) => item.editalId !== editalId)
  }
  return {
    eventos,
    ordenados,
    adicionarEvento,
    editarEvento,
    excluirEvento,
    excluirEventosDoEdital,
  }
})
