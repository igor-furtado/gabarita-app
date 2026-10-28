<script setup lang="ts">
import { computed, ref, nextTick } from "vue";
import {
  Plus,
  CalendarDays,
  BookOpen,
  Check,
  Archive,
  ArrowRight,
  X,
} from "lucide-vue-next";
import Button from "../../components/ui/button/Button.vue";
import {
  today,
  type State,
  type Contest,
  type Command,
} from "../../../server/domain";
import { activeContests, contestProgress } from "../../../server/planning";
const props = defineProps<{
  state: State;
  pending: boolean;
  send: (command: Command) => Promise<boolean>;
}>();
const draft = ref<Contest | null>(null);
const editor = ref<HTMLFormElement | null>(null);
const filter = ref("");
const error = ref("");
const showArchived = ref(false);
const ordered = computed(() =>
  [...(props.state.contests ?? [])]
    .filter((c) => showArchived.value || !c.archived)
    .sort((a, b) => (a.examDate || "9999").localeCompare(b.examDate || "9999")),
);
const focus = computed(() => activeContests(props.state, today())[0]);
const subjects = computed(() =>
  props.state.subjects.filter((s) =>
    s.name.toLocaleLowerCase().includes(filter.value.toLocaleLowerCase()),
  ),
);
const regularTopics = (subject: State["subjects"][number]) =>
  subject.topics.filter((topic) => topic.kind === "regular");
function copyContest(c: Contest): Contest {
  return {
    ...c,
    subjects: c.subjects.map((s) => ({ ...s, topicIds: [...s.topicIds] })),
  };
}
function edit(contest?: Contest) {
  draft.value = contest
    ? copyContest(contest)
    : {
        id: crypto.randomUUID(),
        name: "",
        role: "",
        vacancies: null,
        salary: null,
        educationLevel: "",
        examDate: "",
        archived: false,
        subjects: [],
      };
  filter.value = "";
  error.value = "";
  void nextTick(() =>
    editor.value?.scrollIntoView({ behavior: "smooth", block: "start" }),
  );
}
function link(id: string) {
  return draft.value?.subjects.find((s) => s.subjectId === id);
}
function toggleSubject(id: string, selected: boolean) {
  if (!draft.value) return;
  if (selected) {
    draft.value.subjects.push({
      subjectId: id,
      weight: 1,
      allTopics: true,
      topicIds: [],
    });
  } else
    draft.value.subjects = draft.value.subjects.filter(
      (s) => s.subjectId !== id,
    );
}
function days(date: string) {
  return Math.ceil((Date.parse(date) - Date.parse(today())) / 86400000);
}
function currency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}
async function save() {
  if (!draft.value) return;
  if (draft.value.subjects.some((s) => !s.allTopics && !s.topicIds.length)) {
    error.value =
      "Escolha pelo menos um tópico nas matérias com seleção específica.";
    return;
  }
  const ok = await props.send({
    type: "contest",
    contest: copyContest(draft.value),
  });
  if (ok) draft.value = null;
}
async function archive(contest: Contest) {
  await props.send({
    type: "contest",
    contest: { ...contest, archived: !contest.archived },
  });
}
</script>

<template>
  <div class="page-heading">
    <div>
      <div class="eyebrow">UMA PREPARAÇÃO, VÁRIAS POSSIBILIDADES</div>
      <h1>Meus concursos.</h1>
      <p>Conecte seus editais ao que você já estuda.</p>
    </div>
    <Button :disabled="pending" @click="edit()"
      ><Plus :size="16" /> Adicionar concurso</Button
    >
  </div>
  <div class="info-box">
    Cadastre as matérias uma única vez em
    <RouterLink to="/materias">Matérias e tópicos</RouterLink>. Aqui, escolha o
    que cada edital cobra. Leituras e revisões dos tópicos, além do domínio na
    matéria, são compartilhados automaticamente.
  </div>
  <form
    v-if="draft"
    ref="editor"
    class="card contest-editor"
    @submit.prevent="save"
  >
    <div class="section-title">
      <h2>
        {{
          (state.contests ?? []).some((c) => c.id === draft?.id)
            ? "Editar concurso e edital"
            : "Novo concurso e edital"
        }}
      </h2>
      <Button
        type="button"
        variant="ghost"
        aria-label="Cancelar edição"
        :disabled="pending"
        @click="draft = null"
        ><X :size="18"
      /></Button>
    </div>
    <div class="form-row">
      <label
        >Nome do concurso ou órgão<input
          v-model="draft.name"
          required
          maxlength="160"
          placeholder="Ex.: SEFAZ"
      /></label>
      <label
        >Cargo <small>opcional</small
        ><input
          v-model="draft.role"
          maxlength="160"
          placeholder="Ex.: Auditor fiscal"
      /></label>
    </div>
    <div class="form-row contest-details-row">
      <label
        >Data da prova <small>opcional</small
        ><input v-model="draft.examDate" type="date" /><small
          >Sem data, participa do plano após as provas com data definida.</small
        ></label
      >
      <label
        >Quantidade de vagas <small>opcional</small
        ><input
          :value="draft.vacancies ?? ''"
          type="number"
          min="0"
          step="1"
          placeholder="Ex.: 50"
          @input="
            draft.vacancies =
              ($event.target as HTMLInputElement).value === ''
                ? null
                : Number(($event.target as HTMLInputElement).value)
          "
      /></label>
      <label
        >Salário <small>opcional</small
        ><input
          :value="draft.salary ?? ''"
          type="number"
          min="0"
          step="0.01"
          placeholder="Ex.: 12500,00"
          @input="
            draft.salary =
              ($event.target as HTMLInputElement).value === ''
                ? null
                : Number(($event.target as HTMLInputElement).value)
          "
      /></label>
      <label
        >Nível de escolaridade <small>opcional</small
        ><select v-model="draft.educationLevel">
          <option value="">Não informado</option>
          <option value="medio">Médio</option>
          <option value="tecnico">Técnico</option>
          <option value="superior">Superior</option>
        </select></label
      >
    </div>
    <h3>O que cai neste edital?</h3>
    <p class="micro">
      O peso de 1 a 10 vale somente para este concurso. Quanto maior, mais
      importante a matéria.
    </p>
    <label
      >Buscar no acervo<input
        v-model="filter"
        type="search"
        placeholder="Nome da matéria"
    /></label>
    <div class="contest-subject-list">
      <div
        v-for="subject in subjects"
        :key="subject.id"
        class="contest-subject"
      >
        <label class="check-label"
          ><input
            type="checkbox"
            :checked="!!link(subject.id)"
            @change="
              toggleSubject(
                subject.id,
                ($event.target as HTMLInputElement).checked,
              )
            "
          />{{ subject.name }}
          <small>{{ regularTopics(subject).length }} tópicos</small></label
        >
        <div v-if="link(subject.id)" class="contest-scope">
          <label
            >Peso no edital<input
              v-model.number="link(subject.id)!.weight"
              type="number"
              min="1"
              max="10"
              step="0.5"
              required
          /></label>
          <label
            >Abrangência<select
              v-model="link(subject.id)!.allTopics"
              @change="link(subject.id)!.topicIds = []"
            >
              <option :value="true">Todos os tópicos</option>
              <option :value="false">Selecionar tópicos</option>
            </select></label
          >
          <div v-if="!link(subject.id)!.allTopics" class="topic-selection">
            <p v-if="!regularTopics(subject).length" class="micro">
              Cadastre os tópicos dessa matéria no acervo antes de fazer uma
              seleção específica.
            </p>
            <label
              v-for="topic in regularTopics(subject)"
              :key="topic.id"
              class="check-label"
              ><input
                v-model="link(subject.id)!.topicIds"
                type="checkbox"
                :value="topic.id"
              />{{ topic.name }}<small v-if="topic.read">Já lido</small></label
            >
          </div>
        </div>
      </div>
      <p v-if="!subjects.length" class="micro">
        Nenhuma matéria encontrada. Acrescente-a em Matérias e tópicos e volte
        ao edital.
      </p>
    </div>
    <p v-if="!draft.subjects.length" class="micro">
      Você pode salvar o concurso agora e completar o edital depois. Sem
      matérias, ele ainda não gera sugestões de estudo.
    </p>
    <p v-if="error" role="alert">{{ error }}</p>
    <div class="contest-actions">
      <Button :disabled="pending"
        ><Check :size="16" />{{
          pending ? "Salvando…" : "Salvar concurso e edital"
        }}</Button
      ><Button
        type="button"
        variant="outline"
        :disabled="pending"
        @click="draft = null"
        >Cancelar</Button
      >
    </div>
  </form>
  <div v-if="!draft" class="contest-focus card">
    <CalendarDays :size="24" />
    <div>
      <h2>
        {{
          focus
            ? `Próxima prioridade: ${focus.name}`
            : "Prepare seu próximo objetivo"
        }}
      </h2>
      <p>
        {{
          focus
            ? "A orientação do Meu dia considera a prova mais próxima, o peso e os tópicos comuns. Revisões previstas continuam primeiro."
            : "Adicione um concurso e vincule as matérias para receber orientação pelo edital."
        }}
      </p>
    </div>
    <RouterLink to="/">Meu dia <ArrowRight :size="16" /></RouterLink>
  </div>
  <label class="check-label archive-filter"
    ><input v-model="showArchived" type="checkbox" /> Mostrar concursos
    arquivados</label
  >
  <div class="contest-grid">
    <article
      v-for="contest in ordered"
      :key="contest.id"
      class="card contest-card"
    >
      <div class="eyebrow">
        {{
          contest.archived
            ? "ARQUIVADO"
            : contest.examDate && days(contest.examDate) < 0
              ? "PROVA ENCERRADA"
              : contest.id === focus?.id
                ? "PRÓXIMA PRIORIDADE"
                : "EM PREPARAÇÃO"
        }}
      </div>
      <h2>{{ contest.name }}</h2>
      <p v-if="contest.role" class="contest-role">{{ contest.role }}</p>
      <div
        v-if="
          contest.vacancies !== null ||
          contest.salary !== null ||
          contest.educationLevel
        "
        class="contest-facts"
      >
        <span v-if="contest.vacancies !== null"
          >{{ contest.vacancies }}
          {{ contest.vacancies === 1 ? "vaga" : "vagas" }}</span
        >
        <span v-if="contest.salary !== null">{{
          currency(contest.salary)
        }}</span>
        <span v-if="contest.educationLevel"
          >Nível
          {{
            {
              medio: "médio",
              tecnico: "técnico",
              superior: "superior",
            }[contest.educationLevel]
          }}</span
        >
      </div>
      <p class="contest-date">
        <CalendarDays :size="16" />{{
          contest.examDate
            ? contest.examDate.split("-").reverse().join("/")
            : "Data a definir"
        }}<span v-if="contest.examDate && days(contest.examDate) >= 0">
          ·
          {{
            days(contest.examDate) === 0
              ? "Hoje"
              : `em ${days(contest.examDate)} dias`
          }}</span
        >
      </p>
      <div class="contest-coverage">
        <BookOpen :size="16" /> {{ contest.subjects.length }} matérias ·
        {{ contestProgress(state, contest).total }} tópicos
      </div>
      <progress
        :value="contestProgress(state, contest).read"
        :max="contestProgress(state, contest).total || 1"
        :aria-label="`Leitura do edital ${contest.name}`"
      />
      <p class="micro">
        {{ contestProgress(state, contest).read }} de
        {{ contestProgress(state, contest).total }} tópicos lidos
      </p>
      <p v-if="!contestProgress(state, contest).total" class="micro">
        Complete o edital com matérias e tópicos para começar.
      </p>
      <p v-if="contest.examDate && days(contest.examDate) < 0" class="micro">
        Esta prova saiu da priorização. Atualize a data ou arquive o concurso.
        Seu histórico continua no acervo.
      </p>
      <div class="contest-tags">
        <span v-for="entry in contest.subjects" :key="entry.subjectId"
          >{{ state.subjects.find((s) => s.id === entry.subjectId)?.name }} ·
          peso {{ entry.weight
          }}{{
            entry.allTopics ? "" : ` · ${entry.topicIds.length} tópicos`
          }}</span
        >
      </div>
      <div class="contest-actions">
        <Button variant="outline" :disabled="pending" @click="edit(contest)"
          >Editar edital</Button
        ><Button variant="ghost" :disabled="pending" @click="archive(contest)"
          ><Archive :size="15" />{{
            contest.archived ? "Reativar" : "Arquivar"
          }}</Button
        >
      </div>
    </article>
  </div>
</template>

<style scoped>
.contest-editor,
.contest-focus {
  margin: 24px 0;
}
.contest-editor {
  display: grid;
  gap: 18px;
}
.contest-editor h3,
.contest-card h2 {
  margin: 0;
}
.contest-details-row {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}
.contest-subject-list {
  max-height: 480px;
  overflow: auto;
  border: 1px solid var(--border, #e3e5de);
  border-radius: 12px;
}
.contest-subject {
  padding: 16px;
  border-bottom: 1px solid var(--border, #e3e5de);
}
.check-label {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  cursor: pointer;
}
.check-label input {
  width: 17px;
  height: 17px;
  flex-shrink: 0;
  accent-color: #496c50;
}
.check-label small {
  color: #737b70;
  font-weight: 400;
}
.contest-scope {
  margin: 16px 0 0 27px;
  display: grid;
  grid-template-columns: 100px 1fr;
  gap: 12px;
}
.topic-selection {
  grid-column: 1/-1;
}
.contest-scope input,
.contest-scope select {
  height: 42px;
}
.topic-selection {
  display: grid;
  gap: 12px;
}
.contest-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}
.contest-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}
.contest-card p {
  margin: 0;
}
.contest-role {
  margin-top: -10px !important;
  color: #66705f;
  font-size: 14px;
}
.contest-facts {
  display: flex;
  gap: 7px;
  flex-wrap: wrap;
}
.contest-facts span {
  padding: 5px 8px;
  border-radius: 6px;
  background: #f0f2ec;
  color: #5f6958;
  font-size: 11px;
}
.contest-date,
.contest-coverage {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
  font-size: 13px;
}
.contest-card progress::-webkit-progress-bar {
  background: #e9ede5;
  border-radius: 6px;
}
.contest-card progress::-webkit-progress-value {
  background: #496c50;
  border-radius: 6px;
}
.contest-card progress::-moz-progress-bar {
  background: #496c50;
  border-radius: 6px;
}
.contest-card progress {
  appearance: none;
  border: 0;
  border-radius: 6px;
  overflow: hidden;
  width: 100%;
  height: 8px;
  accent-color: #496c50;
}
.contest-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: auto;
}
.contest-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.contest-tags span {
  font-size: 11px;
  background: #f0f2ec;
  padding: 6px 9px;
  border-radius: 6px;
}
.contest-focus {
  display: flex;
  align-items: center;
  gap: 18px;
}
.contest-focus div {
  flex: 1;
}
.contest-focus h2 {
  font-size: 18px;
}
.contest-focus p {
  font-size: 13px;
  line-height: 1.6;
}
.contest-focus a {
  display: flex;
  gap: 8px;
  align-items: center;
  white-space: nowrap;
}
.archive-filter {
  margin: 24px 0 16px;
  font-size: 13px;
}
@media (max-width: 800px) {
  .contest-editor .form-row {
    grid-template-columns: 1fr;
  }
  .contest-grid {
    grid-template-columns: 1fr;
  }
  .contest-focus {
    align-items: flex-start;
    flex-wrap: wrap;
  }
  .contest-scope {
    margin-left: 0;
  }
}
</style>
