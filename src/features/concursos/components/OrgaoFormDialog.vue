<script setup lang="ts">
import { reactive, ref } from 'vue'
import { Plus } from '@lucide/vue'
import Button from '@/components/ui/Button.vue'
import FormDialog from '@/components/ui/FormDialog.vue'
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
  <FormDialog
    v-model="open"
    title="Novo concurso"
    description="Cadastre o órgão responsável. O edital pode ser incluído nos detalhes."
    content-class="max-w-xl"
    form-class="grid gap-4 sm:grid-cols-2"
    actions-class="sm:col-span-2"
    submit-label="Criar concurso"
    @submit="submit"
  >
    <template #trigger
      ><Button><Plus class="size-4" />Novo concurso</Button></template
    >
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
        <option v-for="tipo in ['municipal', 'estadual', 'federal'] as AtuacaoOrgao[]" :key="tipo">
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
  </FormDialog>
</template>
