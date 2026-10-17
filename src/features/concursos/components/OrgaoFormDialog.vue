<script setup lang="ts">
import { reactive, ref } from 'vue'
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
import { Plus } from '@lucide/vue'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import type { AtuacaoOrgao, NovoOrgao } from '@/types/domain'

const emit = defineEmits<{ save: [data: NovoOrgao] }>()
const open = ref(false)
const form = reactive<NovoOrgao>({
  sigla: '',
  nome: '',
  atuacao: 'federal',
  municipioSede: '',
  ufSede: '',
})
function submit() {
  emit('save', { ...form, sigla: form.sigla.toUpperCase(), ufSede: form.ufSede.toUpperCase() })
  Object.assign(form, { sigla: '', nome: '', atuacao: 'federal', municipioSede: '', ufSede: '' })
  open.value = false
}
</script>
<template>
  <DialogRoot v-model:open="open"
    ><DialogTrigger as-child
      ><Button><Plus class="size-4" />Novo concurso</Button></DialogTrigger
    ><DialogPortal
      ><DialogOverlay class="fixed inset-0 z-40 bg-slate-950/40" /><DialogContent
        class="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
        ><DialogTitle class="text-xl font-bold">Novo concurso</DialogTitle
        ><DialogDescription class="mt-1 text-sm text-slate-500"
          >Cadastre o órgão responsável. O edital pode ser incluído nos detalhes.</DialogDescription
        >
        <form class="mt-6 grid gap-4 sm:grid-cols-2" @submit.prevent="submit">
          <label class="space-y-1.5"
            ><span class="text-sm font-semibold">Sigla</span
            ><Input v-model="form.sigla" required placeholder="Ex.: TRT-7" /></label
          ><label class="space-y-1.5"
            ><span class="text-sm font-semibold">Atuação</span
            ><select
              v-model="form.atuacao"
              class="h-10 w-full rounded-lg border bg-white px-3 text-sm"
              required
            >
              <option
                v-for="tipo in ['municipal', 'estadual', 'federal'] as AtuacaoOrgao[]"
                :key="tipo"
              >
                {{ tipo }}
              </option>
            </select></label
          ><label class="space-y-1.5 sm:col-span-2"
            ><span class="text-sm font-semibold">Nome do órgão</span
            ><Input v-model="form.nome" required placeholder="Nome completo" /></label
          ><label class="space-y-1.5"
            ><span class="text-sm font-semibold">Município sede</span
            ><Input v-model="form.municipioSede" required /></label
          ><label class="space-y-1.5"
            ><span class="text-sm font-semibold">UF sede</span
            ><Input v-model="form.ufSede" required class="uppercase" placeholder="CE"
          /></label>
          <div class="mt-2 flex justify-end gap-3 sm:col-span-2">
            <DialogClose as-child><Button variant="secondary">Cancelar</Button></DialogClose
            ><Button type="submit">Criar concurso</Button>
          </div>
        </form></DialogContent
      ></DialogPortal
    ></DialogRoot
  >
</template>
