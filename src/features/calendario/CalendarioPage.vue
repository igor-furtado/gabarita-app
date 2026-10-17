<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { CalendarPlus, Trash2 } from '@lucide/vue'
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from 'reka-ui'
import Button from '@/components/ui/Button.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import Input from '@/components/ui/Input.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import { formatarData } from '@/lib/utils'
import { useCalendarioStore } from '@/stores/calendario'
import { useConcursosStore } from '@/stores/concursos'
import { useFeedbackStore } from '@/stores/feedback'
import type { TipoEvento } from '@/types/domain'

const calendario = useCalendarioStore()
const concursosStore = useConcursosStore()
const feedback = useFeedbackStore()
const { ordenados } = storeToRefs(calendario)
const { editais, orgaos } = storeToRefs(concursosStore)
const open = ref(false)
const tipos: TipoEvento[] = [
  'prova',
  'início das inscrições',
  'fim das inscrições',
  'publicação de edital',
]
const form = reactive<{ editalId: string; tipo: TipoEvento; data: string }>({
  editalId: editais.value[0]?.id ?? '',
  tipo: 'prova',
  data: '',
})
const agrupados = computed(() => {
  const grupos = new Map<string, typeof ordenados.value>()
  for (const evento of ordenados.value) {
    const chave = evento.data.slice(0, 7)
    grupos.set(chave, [...(grupos.get(chave) ?? []), evento])
  }
  return [...grupos.entries()]
})
function nomeEdital(id: string) {
  const edital = editais.value.find((item) => item.id === id)
  const orgao = orgaos.value.find((item) => item.id === edital?.orgaoId)
  return orgao && edital ? `${orgao.sigla} · ${edital.numero}` : 'Edital removido'
}
function mes(chave: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${chave}-02T12:00:00Z`))
}
function adicionar() {
  calendario.adicionarEvento({ ...form })
  form.data = ''
  open.value = false
  feedback.success('Evento adicionado ao calendário.')
}
function excluirEvento(id: string) {
  calendario.excluirEvento(id)
  feedback.success('Evento excluído do calendário.')
}
</script>
<template>
  <section>
    <PageHeader
      title="Calendário"
      description="Visualize as datas relevantes dos editais em uma linha do tempo simples."
      ><DialogRoot v-model:open="open"
        ><DialogTrigger as-child
          ><Button :disabled="!editais.length"
            ><CalendarPlus class="size-4" />Novo evento</Button
          ></DialogTrigger
        ><DialogPortal
          ><DialogOverlay class="fixed inset-0 z-40 bg-slate-950/40" /><DialogContent
            class="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl"
            ><DialogTitle class="text-xl font-bold">Novo evento</DialogTitle
            ><DialogDescription class="mt-1 text-sm text-slate-500"
              >Toda data deve estar vinculada a um edital.</DialogDescription
            >
            <form class="mt-6 space-y-4" @submit.prevent="adicionar">
              <label class="block space-y-1.5"
                ><span class="text-sm font-semibold">Edital</span
                ><select
                  v-model="form.editalId"
                  required
                  class="h-10 w-full rounded-lg border bg-white px-3 text-sm"
                >
                  <option v-for="edital in editais" :key="edital.id" :value="edital.id">
                    {{ nomeEdital(edital.id) }}
                  </option>
                </select></label
              ><label class="block space-y-1.5"
                ><span class="text-sm font-semibold">Tipo</span
                ><select
                  v-model="form.tipo"
                  class="h-10 w-full rounded-lg border bg-white px-3 text-sm"
                >
                  <option v-for="tipo in tipos" :key="tipo">{{ tipo }}</option>
                </select></label
              ><label class="block space-y-1.5"
                ><span class="text-sm font-semibold">Data</span
                ><Input v-model="form.data" type="date" required
              /></label>
              <div class="flex justify-end gap-3">
                <DialogClose as-child><Button variant="secondary">Cancelar</Button></DialogClose
                ><Button type="submit">Adicionar</Button>
              </div>
            </form></DialogContent
          ></DialogPortal
        ></DialogRoot
      ></PageHeader
    ><EmptyState
      v-if="!ordenados.length"
      title="Nenhuma data registrada"
      description="Adicione um evento a partir de um edital existente."
    />
    <div v-else class="space-y-8">
      <section v-for="[chave, eventos] in agrupados" :key="chave">
        <h2 class="mb-3 text-sm font-black uppercase tracking-widest text-slate-400">
          {{ mes(chave) }}
        </h2>
        <div class="overflow-hidden rounded-xl border bg-white">
          <article
            v-for="evento in eventos"
            :key="evento.id"
            class="flex items-center gap-4 border-b p-4 last:border-0"
          >
            <time
              :datetime="evento.data"
              class="grid size-12 shrink-0 place-items-center rounded-lg bg-emerald-50 text-center text-sm font-black text-emerald-800"
              >{{ evento.data.slice(8, 10) }}</time
            >
            <div class="min-w-0 flex-1">
              <h3 class="font-semibold capitalize">{{ evento.tipo }}</h3>
              <p class="mt-1 text-sm text-slate-500">
                {{ nomeEdital(evento.editalId) }} · {{ formatarData(evento.data) }}
              </p>
            </div>
            <ConfirmDialog
              title="Excluir evento?"
              description="Esta data será removida apenas da sessão atual."
              @confirm="excluirEvento(evento.id)"
              ><Button variant="ghost" size="sm" aria-label="Excluir evento"
                ><Trash2 class="size-4" /></Button
            ></ConfirmDialog>
          </article>
        </div>
      </section>
    </div>
  </section>
</template>
