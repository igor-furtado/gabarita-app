<script setup lang="ts">
import { reactive, ref } from 'vue'
import { DialogClose } from 'reka-ui'
import { FilePlus2 } from '@lucide/vue'
import Button from '@/components/ui/Button.vue'
import FormDialog from '@/components/ui/FormDialog.vue'
import Input from '@/components/ui/Input.vue'
import type { NovoEdital, SituacaoEdital } from '@/types/domain'

const emit = defineEmits<{ save: [data: NovoEdital] }>()
const open = ref(false)
const situacoes: SituacaoEdital[] = [
  'previsto',
  'autorizado',
  'comissão formada',
  'banca definida',
  'inscrições abertas',
  'em andamento',
  'vigente',
  'prorrogado',
  'anulado',
  'encerrado',
]
const form = reactive<NovoEdital>({
  titulo: '',
  numero: '',
  banca: '',
  situacao: 'previsto',
  dataPublicacao: '',
  urlDocumento: '',
  observacoes: '',
})
function submit() {
  emit('save', { ...form })
  open.value = false
}
</script>
<template>
  <FormDialog
    v-model="open"
    title="Adicionar edital"
    description="Registre o último edital publicado por este órgão."
    content-class="max-w-2xl"
  >
    <template #trigger
      ><Button><FilePlus2 class="size-4" />Adicionar edital</Button></template
    >
    <form class="mt-6 grid gap-4 sm:grid-cols-2" @submit.prevent="submit">
      <label class="space-y-1.5 sm:col-span-2"
        ><span class="text-sm font-semibold">Título</span
        ><Input v-model="form.titulo" required /></label
      ><label class="space-y-1.5"
        ><span class="text-sm font-semibold">Número</span
        ><Input v-model="form.numero" required placeholder="01/2026" /></label
      ><label class="space-y-1.5"
        ><span class="text-sm font-semibold">Banca</span
        ><Input v-model="form.banca" required /></label
      ><label class="space-y-1.5"
        ><span class="text-sm font-semibold">Situação</span
        ><select
          v-model="form.situacao"
          class="h-10 w-full rounded-lg border bg-white px-3 text-sm"
        >
          <option v-for="item in situacoes" :key="item">{{ item }}</option>
        </select></label
      ><label class="space-y-1.5"
        ><span class="text-sm font-semibold">Publicação</span
        ><Input v-model="form.dataPublicacao" type="date" required /></label
      ><label class="space-y-1.5 sm:col-span-2"
        ><span class="text-sm font-semibold">URL do documento</span
        ><Input v-model="form.urlDocumento" type="url" required /></label
      ><label class="space-y-1.5 sm:col-span-2"
        ><span class="text-sm font-semibold">Observações</span
        ><textarea
          v-model="form.observacoes"
          class="min-h-24 w-full rounded-lg border p-3 text-sm"
        />
      </label>
      <div class="mt-2 flex justify-end gap-3 sm:col-span-2">
        <DialogClose as-child><Button variant="secondary">Cancelar</Button></DialogClose
        ><Button type="submit">Salvar edital</Button>
      </div>
    </form>
  </FormDialog>
</template>
