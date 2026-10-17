<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import {
  createColumnHelper,
  FlexRender,
  getCoreRowModel,
  getSortedRowModel,
  useVueTable,
  type SortingState,
} from '@tanstack/vue-table'
import { ArrowUpDown, ChevronRight, Search } from '@lucide/vue'
import { useRouter } from 'vue-router'
import Badge from '@/components/ui/Badge.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import Input from '@/components/ui/Input.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import OrgaoFormDialog from './components/OrgaoFormDialog.vue'
import { useConcursosStore } from '@/stores/concursos'
import { useFeedbackStore } from '@/stores/feedback'
import type { Edital, Orgao } from '@/types/domain'

interface ConcursoLinha {
  orgao: Orgao
  edital?: Edital
}
const store = useConcursosStore()
const feedback = useFeedbackStore()
const { concursos } = storeToRefs(store)
const router = useRouter()
const busca = ref('')
const sorting = ref<SortingState>([])
const dados = computed(() => {
  const termo = busca.value.trim().toLocaleLowerCase('pt-BR')
  if (!termo) return concursos.value
  return concursos.value.filter(({ orgao, edital }) =>
    [orgao.sigla, orgao.nome, edital?.banca, edital?.situacao].some((campo) =>
      campo?.toLocaleLowerCase('pt-BR').includes(termo),
    ),
  )
})
const helper = createColumnHelper<ConcursoLinha>()
const columns = [
  helper.accessor((row) => row.orgao.sigla, { id: 'sigla', header: 'Órgão' }),
  helper.accessor((row) => row.orgao.nome, { id: 'nome', header: 'Nome' }),
  helper.accessor((row) => row.edital?.situacao ?? 'Sem edital', {
    id: 'situacao',
    header: 'Situação',
  }),
  helper.accessor((row) => row.edital?.banca ?? '—', { id: 'banca', header: 'Banca' }),
  helper.display({ id: 'abrir', header: '' }),
]
const table = useVueTable({
  get data() {
    return dados.value
  },
  columns,
  state: {
    get sorting() {
      return sorting.value
    },
  },
  onSortingChange: (updater) => {
    sorting.value = typeof updater === 'function' ? updater(sorting.value) : updater
  },
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
})
function tone(situacao?: string) {
  return situacao === 'inscrições abertas' || situacao === 'vigente'
    ? 'green'
    : situacao === 'anulado' || situacao === 'encerrado'
      ? 'red'
      : 'amber'
}
function criarConcurso(dados: Parameters<typeof store.criarOrgao>[0]) {
  const orgao = store.criarOrgao(dados)
  feedback.success(`${orgao.sigla} foi adicionado.`)
}
</script>

<template>
  <section>
    <PageHeader
      title="Concursos"
      description="Acompanhe os órgãos e o último edital associado a cada um."
      ><OrgaoFormDialog @save="criarConcurso"
    /></PageHeader>
    <div class="mb-4 max-w-sm">
      <label for="busca" class="sr-only">Buscar concursos</label>
      <div class="relative">
        <Search class="pointer-events-none absolute left-3 top-3 size-4 text-slate-400" /><Input
          id="busca"
          v-model="busca"
          class="pl-9"
          placeholder="Buscar por órgão, banca ou situação"
        />
      </div>
    </div>
    <EmptyState
      v-if="dados.length === 0"
      title="Nenhum concurso encontrado"
      description="Ajuste sua busca ou cadastre um novo concurso."
    />
    <div v-else class="overflow-hidden rounded-xl border bg-white shadow-sm">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[720px] text-left text-sm">
          <thead class="border-b bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr v-for="group in table.getHeaderGroups()" :key="group.id">
              <th
                v-for="header in group.headers"
                :key="header.id"
                class="px-4 py-3"
                :class="header.id === 'abrir' && 'w-10'"
              >
                <button
                  v-if="header.column.getCanSort()"
                  class="flex items-center gap-2 font-bold"
                  @click="header.column.toggleSorting()"
                >
                  <FlexRender
                    :render="header.column.columnDef.header"
                    :props="header.getContext()"
                  /><ArrowUpDown class="size-3" /></button
                ><FlexRender
                  v-else-if="!header.isPlaceholder"
                  :render="header.column.columnDef.header"
                  :props="header.getContext()"
                />
              </th>
            </tr>
          </thead>
          <tbody class="divide-y">
            <tr
              v-for="row in table.getRowModel().rows"
              :key="row.id"
              class="cursor-pointer transition hover:bg-slate-50"
              tabindex="0"
              @click="router.push(`/concursos/${row.original.orgao.id}`)"
              @keydown.enter="router.push(`/concursos/${row.original.orgao.id}`)"
            >
              <td class="px-4 py-4 font-bold text-slate-950">{{ row.original.orgao.sigla }}</td>
              <td class="px-4 py-4 text-slate-600">{{ row.original.orgao.nome }}</td>
              <td class="px-4 py-4">
                <Badge :tone="tone(row.original.edital?.situacao)">{{
                  row.original.edital?.situacao ?? 'Sem edital'
                }}</Badge>
              </td>
              <td class="px-4 py-4 text-slate-600">{{ row.original.edital?.banca ?? '—' }}</td>
              <td class="px-4 py-4 text-slate-400"><ChevronRight class="size-4" /></td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="border-t bg-slate-50 px-4 py-3 text-xs text-slate-500">
        {{ dados.length }} {{ dados.length === 1 ? 'concurso' : 'concursos' }}
      </p>
    </div>
  </section>
</template>
