<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { ArrowLeft, ExternalLink, MapPin, Trash2 } from '@lucide/vue'
import { useRoute, useRouter } from 'vue-router'
import Badge from '@/components/ui/Badge.vue'
import Button from '@/components/ui/Button.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import EditalFormDialog from './components/EditalFormDialog.vue'
import { formatarData, formatarMoeda } from '@/lib/utils'
import { useCalendarioStore } from '@/stores/calendario'
import { useConcursosStore } from '@/stores/concursos'
import { useFeedbackStore } from '@/stores/feedback'

const route = useRoute()
const router = useRouter()
const store = useConcursosStore()
const calendario = useCalendarioStore()
const feedback = useFeedbackStore()
const { orgaos, editais, perfis, cargos } = storeToRefs(store)
const id = computed(() => String(route.params.id))
const orgao = computed(() => orgaos.value.find((item) => item.id === id.value))
const edital = computed(() => editais.value.find((item) => item.orgaoId === id.value))
const perfisDoEdital = computed(() =>
  perfis.value.filter((item) => item.editalId === edital.value?.id),
)
function excluirConcurso() {
  const sigla = orgao.value?.sigla ?? 'Concurso'
  if (edital.value) calendario.excluirEventosDoEdital(edital.value.id)
  store.excluirOrgao(id.value)
  feedback.success(`${sigla} foi excluído.`)
  void router.push('/concursos')
}
function excluirEdital() {
  if (edital.value) {
    calendario.excluirEventosDoEdital(edital.value.id)
    store.excluirEdital(edital.value.id)
    feedback.success('Edital excluído.')
  }
}
function adicionarEdital(dados: Parameters<typeof store.adicionarEdital>[1]) {
  if (!orgao.value) return
  store.adicionarEdital(orgao.value.id, dados)
  feedback.success('Edital adicionado.')
}
</script>
<template>
  <section v-if="orgao">
    <RouterLink
      to="/concursos"
      class="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-emerald-800"
      ><ArrowLeft class="size-4" />Voltar para concursos</RouterLink
    >
    <header class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div class="flex items-center gap-3">
          <h1 class="text-3xl font-black tracking-tight">{{ orgao.sigla }}</h1>
          <Badge>{{ orgao.atuacao }}</Badge>
        </div>
        <p class="mt-2 text-slate-600">{{ orgao.nome }}</p>
        <p class="mt-2 flex items-center gap-1.5 text-sm text-slate-500">
          <MapPin class="size-4" />{{ orgao.municipioSede }} · {{ orgao.ufSede }}
        </p>
      </div>
      <ConfirmDialog
        title="Excluir concurso?"
        description="O órgão, seu edital e todos os perfis associados serão removidos desta sessão."
        @confirm="excluirConcurso"
        ><Button variant="secondary"
          ><Trash2 class="size-4" />Excluir concurso</Button
        ></ConfirmDialog
      >
    </header>
    <EmptyState
      v-if="!edital"
      title="Este concurso ainda não tem edital"
      description="Adicione o último edital divulgado pelo órgão para organizar cargos, conteúdo e datas."
      ><EditalFormDialog @save="adicionarEdital"
    /></EmptyState>
    <div v-else class="space-y-6">
      <article class="rounded-xl border bg-white p-5 shadow-sm">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="text-xl font-bold">{{ edital.titulo }}</h2>
              <Badge tone="green">{{ edital.situacao }}</Badge>
            </div>
            <p class="mt-2 text-sm text-slate-500">
              Edital {{ edital.numero }} · {{ edital.banca }} · publicado em
              {{ formatarData(edital.dataPublicacao) }}
            </p>
          </div>
          <div class="flex gap-2">
            <a
              :href="edital.urlDocumento"
              target="_blank"
              rel="noopener"
              class="inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-bold hover:bg-slate-50"
              >Documento <ExternalLink class="size-3" /></a
            ><ConfirmDialog
              title="Excluir edital?"
              description="Os perfis vinculados a este edital também serão removidos."
              @confirm="excluirEdital"
              ><Button variant="ghost" size="sm" aria-label="Excluir edital"
                ><Trash2 class="size-4 text-red-600" /></Button
            ></ConfirmDialog>
          </div>
        </div>
        <p v-if="edital.observacoes" class="mt-5 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
          {{ edital.observacoes }}
        </p>
      </article>
      <div>
        <h2 class="mb-3 text-lg font-bold">Perfis e cargos</h2>
        <div v-if="perfisDoEdital.length" class="grid gap-3 lg:grid-cols-2">
          <article
            v-for="perfil in perfisDoEdital"
            :key="perfil.id"
            class="rounded-xl border bg-white p-4"
          >
            <div class="flex items-start justify-between">
              <div>
                <h3 class="font-bold">
                  {{ cargos.find((item) => item.id === perfil.cargoId)?.nome }}
                </h3>
                <p class="text-sm text-slate-500">
                  {{ cargos.find((item) => item.id === perfil.cargoId)?.area }}
                </p>
              </div>
              <strong class="text-sm text-emerald-800">{{
                formatarMoeda(perfil.remuneracao)
              }}</strong>
            </div>
            <dl class="mt-4 grid grid-cols-3 gap-3 border-t pt-4 text-xs">
              <div>
                <dt class="text-slate-400">Vagas</dt>
                <dd class="mt-1 font-bold">{{ perfil.vagasAmpla }}</dd>
              </div>
              <div>
                <dt class="text-slate-400">Carga</dt>
                <dd class="mt-1 font-bold">{{ perfil.cargaHoraria }}h</dd>
              </div>
              <div>
                <dt class="text-slate-400">Lotação</dt>
                <dd class="mt-1 font-bold">{{ perfil.ufLotacao }}</dd>
              </div>
            </dl>
          </article>
        </div>
        <p v-else class="rounded-xl border border-dashed p-6 text-sm text-slate-500">
          Nenhum perfil associado a este edital.
        </p>
      </div>
    </div>
  </section>
  <EmptyState
    v-else
    title="Concurso não encontrado"
    description="Este item não existe ou foi removido."
    ><RouterLink to="/concursos"><Button>Voltar para concursos</Button></RouterLink></EmptyState
  >
</template>
