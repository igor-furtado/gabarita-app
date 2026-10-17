<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { CheckCircle2, Circle, Plus, Trash2 } from '@lucide/vue'
import Button from '@/components/ui/Button.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import FormDialog from '@/components/ui/FormDialog.vue'
import Input from '@/components/ui/Input.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import { useConcursosStore } from '@/stores/concursos'
import { useDisciplinasStore } from '@/stores/disciplinas'
import { useFeedbackStore } from '@/stores/feedback'

const store = useDisciplinasStore()
const concursos = useConcursosStore()
const feedback = useFeedbackStore()
const { ordenadas, topicos } = storeToRefs(store)
const { cargos, editais, perfis } = storeToRefs(concursos)
const selecionada = ref(ordenadas.value[0]?.id ?? '')
const open = ref(false)
const topicOpen = ref(false)
const nova = reactive({ nome: '', cor: '#047857' })
const novoTopico = reactive({ titulo: '', perfilId: perfis.value[0]?.id ?? '', pesoProva: '1' })
const topicosAtuais = computed(() =>
  topicos.value
    .filter((item) => item.disciplinaId === selecionada.value)
    .sort((a, b) => a.ordem - b.ordem),
)
const progresso = computed(() =>
  topicosAtuais.value.length
    ? Math.round(
        (topicosAtuais.value.filter((item) => item.concluido).length / topicosAtuais.value.length) *
          100,
      )
    : 0,
)
function adicionar() {
  const nome = nova.nome
  store.adicionarDisciplina({ nome: nova.nome, cor: nova.cor, ordem: ordenadas.value.length + 1 })
  nova.nome = ''
  open.value = false
  feedback.success(`${nome} foi adicionada.`)
}
function excluirDisciplina(id: string) {
  const nome = ordenadas.value.find((item) => item.id === id)?.nome ?? 'Disciplina'
  store.excluirDisciplina(id)
  selecionada.value = ordenadas.value[0]?.id ?? ''
  feedback.success(`${nome} foi excluída.`)
}
function excluirTopico(id: string) {
  store.excluirTopico(id)
  feedback.success('Tópico excluído.')
}
function nomePerfil(perfilId: string) {
  const perfil = perfis.value.find((item) => item.id === perfilId)
  const cargo = cargos.value.find((item) => item.id === perfil?.cargoId)
  const edital = editais.value.find((item) => item.id === perfil?.editalId)
  return `${cargo?.nome ?? 'Cargo'} · edital ${edital?.numero ?? 'sem número'}`
}
function adicionarTopico() {
  store.adicionarTopico({
    disciplinaId: selecionada.value,
    perfilId: novoTopico.perfilId,
    titulo: novoTopico.titulo,
    pesoProva: Number(novoTopico.pesoProva),
    questoesCertas: 0,
    questoesErradas: 0,
    concluido: false,
    ordem: topicosAtuais.value.length + 1,
  })
  const titulo = novoTopico.titulo
  Object.assign(novoTopico, { titulo: '', pesoProva: '1' })
  topicOpen.value = false
  feedback.success(`${titulo} foi adicionado.`)
}
</script>
<template>
  <section>
    <PageHeader
      title="Disciplinas e tópicos"
      description="Organize o conteúdo cobrado e acompanhe o avanço em cada matéria."
      ><FormDialog
        v-model="open"
        title="Nova disciplina"
        description="Inclua uma matéria na sua organização."
        submit-label="Adicionar"
        form-class="space-y-4"
        @submit="adicionar"
      >
        <template #trigger
          ><Button><Plus class="size-4" />Nova disciplina</Button></template
        >
        <label class="block space-y-1.5"
          ><span class="text-sm font-semibold">Nome</span
          ><Input v-model="nova.nome" required /></label
        ><label class="block space-y-1.5"
          ><span class="text-sm font-semibold">Cor</span
          ><Input v-model="nova.cor" type="color" class="p-1"
        /></label> </FormDialog></PageHeader
    ><EmptyState
      v-if="!ordenadas.length"
      title="Nenhuma disciplina"
      description="Adicione a primeira disciplina para começar a organizar os tópicos."
    />
    <div v-else class="grid gap-6 lg:grid-cols-[300px_1fr]">
      <nav aria-label="Disciplinas" class="space-y-2">
        <button
          v-for="disciplina in ordenadas"
          :key="disciplina.id"
          class="flex w-full items-center gap-3 rounded-xl border bg-white p-3 text-left transition hover:border-slate-300"
          :class="selecionada === disciplina.id && '!border-emerald-600 ring-2 ring-emerald-100'"
          @click="selecionada = disciplina.id"
        >
          <span class="size-3 rounded-full" :style="{ backgroundColor: disciplina.cor }" /><span
            class="min-w-0 flex-1"
            ><strong class="block truncate text-sm">{{ disciplina.nome }}</strong
            ><span class="text-xs text-slate-400"
              >{{
                topicos.filter((item) => item.disciplinaId === disciplina.id).length
              }}
              tópicos</span
            ></span
          >
        </button>
      </nav>
      <div class="rounded-xl border bg-white">
        <header class="flex items-center justify-between border-b p-5">
          <div>
            <h2 class="font-bold">{{ ordenadas.find((item) => item.id === selecionada)?.nome }}</h2>
            <p class="mt-1 text-sm text-slate-500">{{ progresso }}% concluído</p>
          </div>
          <div class="flex items-center gap-2">
            <FormDialog
              v-model="topicOpen"
              title="Novo tópico"
              description="Vincule o conteúdo a um perfil de edital e cargo."
              submit-label="Adicionar tópico"
              form-class="space-y-4"
              @submit="adicionarTopico"
            >
              <template #trigger
                ><Button size="sm" :disabled="!perfis.length"
                  ><Plus class="size-4" />Novo tópico</Button
                ></template
              >
              <label class="block space-y-1.5"
                ><span class="text-sm font-semibold">Título</span
                ><Input v-model="novoTopico.titulo" required
              /></label>
              <label class="block space-y-1.5"
                ><span class="text-sm font-semibold">Perfil</span
                ><select
                  v-model="novoTopico.perfilId"
                  required
                  class="h-10 w-full rounded-lg border bg-white px-3 text-sm"
                >
                  <option v-for="perfil in perfis" :key="perfil.id" :value="perfil.id">
                    {{ nomePerfil(perfil.id) }}
                  </option>
                </select></label
              >
              <label class="block space-y-1.5"
                ><span class="text-sm font-semibold">Peso na prova</span
                ><Input v-model="novoTopico.pesoProva" type="number" min="1" required
              /></label>
            </FormDialog>
            <ConfirmDialog
              title="Excluir disciplina?"
              description="Todos os tópicos desta disciplina também serão excluídos."
              @confirm="excluirDisciplina(selecionada)"
              ><Button variant="ghost" size="sm"
                ><Trash2 class="size-4 text-red-600" />Excluir</Button
              ></ConfirmDialog
            >
          </div>
        </header>
        <div v-if="topicosAtuais.length" class="divide-y">
          <article
            v-for="topico in topicosAtuais"
            :key="topico.id"
            class="flex items-center gap-3 p-4"
          >
            <button
              class="rounded-full text-emerald-700 focus-visible:ring-2"
              :aria-label="topico.concluido ? 'Marcar como pendente' : 'Marcar como concluído'"
              @click="store.alternarConclusao(topico.id)"
            >
              <CheckCircle2 v-if="topico.concluido" class="size-5" /><Circle
                v-else
                class="size-5 text-slate-300"
              />
            </button>
            <div class="min-w-0 flex-1">
              <h3
                class="text-sm font-semibold"
                :class="topico.concluido && 'text-slate-400 line-through'"
              >
                {{ topico.titulo }}
              </h3>
              <p class="mt-1 text-xs text-slate-400">
                Peso {{ topico.pesoProva }} · {{ topico.questoesCertas }} certas ·
                {{ topico.questoesErradas }} erradas
              </p>
            </div>
            <ConfirmDialog
              title="Excluir tópico?"
              description="O tópico será removido desta sessão."
              @confirm="excluirTopico(topico.id)"
              ><Button variant="ghost" size="sm" aria-label="Excluir tópico"
                ><Trash2 class="size-4" /></Button
            ></ConfirmDialog>
          </article>
        </div>
        <div v-else class="p-8 text-center text-sm text-slate-500">
          Nenhum tópico nesta disciplina.
        </div>
      </div>
    </div>
  </section>
</template>
