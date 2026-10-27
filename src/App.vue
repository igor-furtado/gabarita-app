<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useQueryClient } from "@tanstack/vue-query";
import { useIntervalFn, useLocalStorage } from "@vueuse/core";
import {
  LayoutDashboard,
  CalendarDays,
  BookOpen,
  RotateCcw,
  NotebookPen,
  Flag,
  ChartNoAxesCombined,
  Settings,
  ArrowUpRight,
  ArrowRight,
  Plus,
  Play,
  Pause,
  Check,
  Leaf,
  Search,
  X,
  Download,
  Clock,
  ChevronRight,
  Target,
  Menu,
  ArrowUpDown,
  ListTree,
  GripVertical,
} from "lucide-vue-next";
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "reka-ui";
import {
  useVueTable,
  getCoreRowModel,
  FlexRender,
  type ColumnDef,
} from "@tanstack/vue-table";
import ContestsPage from "./features/contests/ContestsPage.vue";
import { activeContests } from "../server/planning";
import Button from "./components/ui/button/Button.vue";
import { useGetState, executeCommand } from "./api/generated";
import {
  phase,
  today,
  addDays,
  recommendation,
  type State,
  type commandSchema,
} from "../server/domain";
import type { z } from "zod";
const route = useRoute(),
  router = useRouter(),
  queryClient = useQueryClient();
const query = useGetState();
const state = computed(() => query.data.value?.data as State | undefined);
const nav = [
  { path: "/", label: "Meu dia", icon: LayoutDashboard },
  { path: "/concursos", label: "Meus concursos", icon: Target },
  { path: "/plano", label: "Plano de estudo", icon: CalendarDays },
  { path: "/materias", label: "Matérias e tópicos", icon: BookOpen },
  { path: "/revisoes", label: "Revisões", icon: RotateCcw },
  { path: "/erros", label: "Caderno de erros", icon: NotebookPen },
  { path: "/vespera", label: "Revisão de véspera", icon: Flag },
  { path: "/progresso", label: "Meu progresso", icon: ChartNoAxesCombined },
];
const title = computed(
  () => nav.find((n) => n.path === route.path)?.label ?? "Meu planejamento",
);
const focusContest = computed(() =>
  state.value ? activeContests(state.value, today())[0] : undefined,
);
const currentPhase = computed(() =>
  state.value ? phase(state.value) : "Fundação",
);
const week = computed(() =>
  state.value
    ? Math.max(
        1,
        Math.min(
          13,
          Math.floor(
            (Date.parse(today()) - Date.parse(state.value.profile.startDate)) /
              604800000,
          ) + 1,
        ),
      )
    : 1,
);
const due = computed(
  () => state.value?.reviews.filter((r) => !r.done && r.due <= today()) ?? [],
);
const ranked = computed(() =>
  [...(state.value?.subjects ?? [])].sort((a, b) => b.weight - a.weight),
);
const limit = computed(() =>
  !state.value
    ? 16
    : state.value.profile.hours < 10
      ? 6
      : state.value.profile.hours < 14
        ? 10
        : 16,
);
const suggested = computed(() =>
  state.value
    ? recommendation(state.value)
    : {
        kind: "organize" as const,
        reason: "Cadastre seus concursos para começar.",
      },
);
const nextTopic = computed(
  () =>
    ranked.value
      .slice(0, limit.value)
      .flatMap((s) =>
        s.topics.filter((t) => !t.read).map((t) => ({ subject: s, topic: t })),
      )[0],
);
const weekMinutes = computed(
  () =>
    state.value?.sessions
      .filter(
        (s) =>
          s.date >=
            addDays(
              today(),
              -((new Date(today() + "T12:00:00").getDay() + 6) % 7),
            ) && s.date <= today(),
      )
      .reduce((n, s) => n + s.minutes, 0) ?? 0,
);
const totals = computed(() => {
  const sessions = state.value?.sessions ?? [];
  return {
    minutes: sessions.reduce((a, s) => a + s.minutes, 0),
    questions: sessions.reduce((a, s) => a + s.questions, 0),
    correct: sessions.reduce((a, s) => a + s.correct, 0),
  };
});
const accuracy = computed(() =>
  totals.value.questions
    ? Math.round((totals.value.correct / totals.value.questions) * 100)
    : 0,
);
const readCount = computed(
  () =>
    state.value?.subjects.flatMap((s) => s.topics).filter((t) => t.read)
      .length ?? 0,
);
const totalTopics = computed(
  () => state.value?.subjects.flatMap((s) => s.topics).length ?? 0,
);
const modal = ref(""),
  pending = ref(false),
  notice = ref(""),
  mobile = ref(false),
  search = ref(""),
  subjectOrder = ref<"alphabetical" | "weight" | "read-desc" | "read-asc">(
    "weight",
  );
const profile = ref({
  name: "",
  target: "",
  examDate: "",
  startDate: today(),
  hours: 14,
  configured: true,
});
watch(
  () => state.value?.profile,
  (p) => {
    if (p) profile.value = { ...p };
  },
  { immediate: true },
);
const subjectId = ref(""),
  topicId = ref(""),
  name = ref(""),
  weight = ref(3),
  reason = ref(""),
  rule = ref(""),
  source = ref(""),
  kind = ref<"reading" | "active" | "mock">("reading"),
  recall = ref(""),
  questions = ref(0),
  correct = ref(0),
  minutes = ref(25),
  reminderKind = ref<
    "memorize" | "attention" | "jurisprudence" | "observation"
  >("memorize");
const activeSubject = computed(() =>
  state.value?.subjects.find((s) => s.id === subjectId.value),
);
const selectedReview = ref("");
const editingId = ref("");
const draggedTopicId = ref("");
const dragOverTopicId = ref("");
type TopicDragEvent = {
  dataTransfer: {
    effectAllowed: string;
    setData: (format: string, data: string) => void;
    getData: (format: string) => string;
  } | null;
};
type TopicPointerEvent = {
  pointerType: string;
  pointerId: number;
  clientX: number;
  clientY: number;
  currentTarget: unknown;
};
type PointerCaptureTarget = {
  setPointerCapture: (pointerId: number) => void;
  hasPointerCapture: (pointerId: number) => boolean;
  releasePointerCapture: (pointerId: number) => void;
};
const timer = useLocalStorage("gabarita-timer", { seconds: 0, running: false });
useIntervalFn(() => {
  if (timer.value.running) timer.value.seconds++;
}, 1000);
const time = computed(
  () =>
    `${Math.floor(timer.value.seconds / 60)
      .toString()
      .padStart(
        2,
        "0",
      )}:${(timer.value.seconds % 60).toString().padStart(2, "0")}`,
);
async function send(command: z.infer<typeof commandSchema>) {
  if (!query.data.value || pending.value) return false;
  pending.value = true;
  notice.value = "";
  try {
    const result = await executeCommand({
      version: query.data.value.version,
      command,
    });
    if (!("data" in result))
      throw new Error(
        (result as unknown as { message: string }).message ??
          "Não foi possível salvar.",
      );
    queryClient.setQueryData(["/api/state"], result);
    await query.refetch();
    return true;
  } catch (e) {
    notice.value = e instanceof Error ? e.message : "Não foi possível salvar.";
    await query.refetch();
    return false;
  } finally {
    pending.value = false;
  }
}
function open(type: string, id?: string) {
  name.value = "";
  reason.value = "";
  rule.value = "";
  source.value = "";
  recall.value = "";
  questions.value = 0;
  correct.value = 0;
  subjectId.value =
    id ?? nextTopic.value?.subject.id ?? ranked.value[0]?.id ?? "";
  topicId.value =
    state.value?.subjects.find((s) => s.id === subjectId.value)?.topics[0]
      ?.id ?? "";
  kind.value = "reading";
  modal.value = type;
}
async function save() {
  let command: z.infer<typeof commandSchema>;
  if (modal.value === "editSubject")
    command = {
      type: "editSubject",
      id: subjectId.value,
      name: name.value,
      materialUrl: source.value,
    };
  else if (modal.value === "editTopic")
    command = {
      type: "editTopic",
      subjectId: subjectId.value,
      id: editingId.value,
      name: name.value,
    };
  else if (modal.value === "subject")
    command = { type: "subject", name: name.value, weight: weight.value };
  else if (modal.value === "topic")
    command = {
      type: "topics",
      names: name.value
        .split("\n")
        .map((topic) => topic.trim())
        .filter(Boolean),
      subjectId: subjectId.value,
    };
  else if (modal.value === "error")
    command = {
      type: "error",
      error: {
        id: crypto.randomUUID(),
        subjectId: subjectId.value,
        topic: name.value,
        reason: reason.value,
        rule: rule.value,
        source: source.value,
        resolved: false,
        date: today(),
      },
    };
  else if (modal.value === "reminder")
    command = {
      type: "reminder",
      reminder: {
        id: crypto.randomUUID(),
        subjectId: subjectId.value,
        text: rule.value,
        kind: reminderKind.value,
        streak: 0,
        marked: true,
      },
    };
  else if (modal.value === "review")
    command = {
      type: "review",
      id: selectedReview.value,
      questions: questions.value,
      correct: correct.value,
    };
  else
    command = {
      type: "session",
      session: {
        id: crypto.randomUUID(),
        subjectId: subjectId.value,
        topicId: topicId.value,
        kind: kind.value,
        date: today(),
        minutes: minutes.value,
        recall: recall.value,
        questions: questions.value,
        correct: correct.value,
      },
    };
  if (await send(command)) {
    modal.value = "";
    if (command.type === "session")
      timer.value = { seconds: 0, running: false };
  }
}
function editSubject(s: State["subjects"][number]) {
  open("editSubject", s.id);
  name.value = s.name;
  source.value = s.materialUrl ?? "";
}
function editTopic(
  s: State["subjects"][number],
  t: State["subjects"][number]["topics"][number],
) {
  open("editTopic", s.id);
  editingId.value = t.id;
  name.value = t.name;
}
function beginTopicDrag(event: TopicDragEvent, id: string) {
  draggedTopicId.value = id;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", id);
  }
}
async function dropTopic(event: TopicDragEvent, targetId: string) {
  const draggedId =
    draggedTopicId.value || event.dataTransfer?.getData("text/plain") || "";
  await reorderDraggedTopic(draggedId, targetId);
}
async function reorderDraggedTopic(draggedId: string, targetId: string) {
  if (!activeSubject.value || pending.value) return;
  const topicIds = activeSubject.value.topics.map((topic) => topic.id);
  const from = topicIds.indexOf(draggedId);
  const destination = topicIds.indexOf(targetId);
  draggedTopicId.value = "";
  dragOverTopicId.value = "";
  if (from < 0 || destination < 0 || from === destination) return;
  const [moved] = topicIds.splice(from, 1);
  topicIds.splice(destination, 0, moved!);
  await send({
    type: "reorderTopics",
    subjectId: activeSubject.value.id,
    topicIds,
  });
}
function beginPointerTopicDrag(event: TopicPointerEvent, id: string) {
  if (event.pointerType === "mouse") return;
  draggedTopicId.value = id;
  (event.currentTarget as PointerCaptureTarget).setPointerCapture(
    event.pointerId,
  );
}
function trackPointerTopicDrag(event: TopicPointerEvent) {
  if (event.pointerType === "mouse" || !draggedTopicId.value) return;
  const row = globalThis.document
    .elementFromPoint(event.clientX, event.clientY)
    ?.closest("[data-topic-id]") as { dataset: { topicId?: string } } | null;
  dragOverTopicId.value = row?.dataset.topicId ?? "";
}
async function finishPointerTopicDrag(event: TopicPointerEvent) {
  if (event.pointerType === "mouse") return;
  const targetId = dragOverTopicId.value;
  const draggedId = draggedTopicId.value;
  const target = event.currentTarget as PointerCaptureTarget;
  if (target.hasPointerCapture(event.pointerId))
    target.releasePointerCapture(event.pointerId);
  await reorderDraggedTopic(draggedId, targetId);
}
function startSuggested() {
  const r = suggested.value;
  if (r.kind === "review") {
    review(r.review.id);
    return;
  }
  if (r.kind === "reading" || r.kind === "active") {
    open("session", r.subject.id);
    topicId.value = r.topic.id;
    kind.value = r.kind;
    return;
  }
  router.push(
    r.kind === "rest"
      ? "/progresso"
      : state.value?.contests?.length
        ? "/concursos"
        : "/materias",
  );
}
function review(id: string) {
  selectedReview.value = id;
  questions.value = 20;
  correct.value = 0;
  modal.value = "review";
}
function exportData() {
  const blob = new Blob([JSON.stringify(state.value, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `gabarita-${today()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
const filteredSubjects = computed(() => {
  const subjects = (state.value?.subjects ?? []).filter((s) =>
    s.name.toLocaleLowerCase().includes(search.value.toLocaleLowerCase()),
  );
  const read = (subject: State["subjects"][number]) =>
    subject.topics.filter((topic) => topic.read).length;
  return subjects.sort((a, b) => {
    if (subjectOrder.value === "alphabetical")
      return a.name.localeCompare(b.name, "pt-BR");
    if (subjectOrder.value === "read-desc")
      return read(b) - read(a) || a.name.localeCompare(b.name, "pt-BR");
    if (subjectOrder.value === "read-asc")
      return read(a) - read(b) || a.name.localeCompare(b.name, "pt-BR");
    return b.weight - a.weight || a.name.localeCompare(b.name, "pt-BR");
  });
});
const modalDescription = computed(() => {
  if (modal.value === "editSubject") return "";
  if (modal.value === "topic")
    return `Adicione um ou mais tópicos em ${activeSubject.value?.name ?? "esta matéria"}.`;
  if (modal.value === "topicsList")
    return "Arraste os tópicos pela alça lateral para definir a ordem de estudo.";
  return "Salvo no seu espaço de estudo. Cada registro ajuda a orientar o próximo passo.";
});
const columns: ColumnDef<State["errors"][number]>[] = [
  {
    id: "subject",
    header: "Matéria",
    cell: (info) =>
      state.value?.subjects.find((s) => s.id === info.row.original.subjectId)
        ?.name,
  },
  { accessorKey: "topic", header: "Assunto" },
  { accessorKey: "reason", header: "Por que errei" },
  { accessorKey: "rule", header: "O que aprendi" },
  { accessorKey: "source", header: "Fonte" },
  {
    accessorKey: "resolved",
    header: "Situação",
    cell: (info) => (info.getValue() ? "Superado" : "Revisar"),
  },
];
const table = useVueTable({
  get data() {
    return (state.value?.errors ?? []).filter((e) =>
      `${e.topic} ${e.rule}`.toLowerCase().includes(search.value.toLowerCase()),
    );
  },
  columns,
  getCoreRowModel: getCoreRowModel(),
});
const weekly = [
  "Administrativo · tópicos 1 a 10",
  "Administrativo · tópicos 11 a 19",
  "Constitucional · tópicos 1 a 8",
  "Constitucional · tópicos 9 a 16",
  "Contabilidade Geral e Avançada",
  "Tributário e Legislação Tributária",
  "Auditoria e Controle Externo",
  "Financeiro e Contabilidade Pública",
  "Administração Pública e Economia",
  "Penal — partes Geral e Especial",
  "Direito Civil e TI",
  "Alterações Legislativas e Julgados",
  "Simulado e Revisões de Véspera",
];
const days = computed(() => {
  const now = new Date(today() + "T12:00:00");
  const monday = addDays(today(), -((now.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => ({
    date: addDays(monday, i),
    label: ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"][i],
    minutes:
      state.value?.sessions
        .filter((s) => s.date === addDays(monday, i))
        .reduce((n, s) => n + s.minutes, 0) ?? 0,
  }));
});
const modalTitles: Record<string, string> = {
  editSubject: "Editar matéria e material",
  editTopic: "Editar tópico",
  subject: "Adicionar matéria",
  topic: "Adicionar tópico",
  session: "Registrar sessão de estudo",
  error: "Transforme o erro em aprendizado",
  reminder: "Guardar lembrete de véspera",
  review: "Concluir revisão",
};
const modalTitle = computed(() =>
  modal.value === "topicsList"
    ? (activeSubject.value?.name ?? "Tópicos")
    : modalTitles[modal.value],
);
</script>

<template>
  <div class="app-shell">
    <aside :class="['sidebar', { visible: mobile }]">
      <RouterLink to="/" class="brand"
        ><span class="brand-symbol">g<span>•</span></span
        >gabarita<span class="brand-dot">.</span></RouterLink
      >
      <div class="workspace">
        <span class="workspace-icon"><BookOpen :size="18" /></span>
        <div>
          <strong>Meu espaço de estudo</strong
          ><small>Um passo de cada vez</small>
        </div>
        <ChevronRight :size="15" />
      </div>
      <p class="nav-label">ORGANIZE SUA JORNADA</p>
      <nav>
        <RouterLink
          v-for="item in nav"
          :key="item.path"
          :to="item.path"
          @click="
            mobile = false;
            search = '';
          "
          :class="{ active: route.path === item.path }"
          ><component :is="item.icon" :size="19" />{{ item.label
          }}<span
            v-if="item.path === '/revisoes' && due.length"
            class="count"
            >{{ due.length }}</span
          ></RouterLink
        >
      </nav>
      <div class="sidebar-tip">
        <Leaf :size="22" /><strong>Constância, não perfeição.</strong>
        <p>Uma rotina possível vale mais que um plano perfeito.</p>
        <span>MÉTODO RODRIGO MARENGO</span>
      </div>
      <RouterLink to="/configuracoes" class="settings"
        ><Settings :size="18" />Meu planejamento</RouterLink
      >
      <div class="user">
        <span>{{ state?.profile.name?.charAt(0) || "V" }}</span>
        <div>
          <strong>{{ state?.profile.name || "Seu próximo capítulo" }}</strong
          ><small>{{ focusContest?.name || "Sua preparação" }}</small>
        </div>
      </div>
    </aside>
    <div class="main-shell">
      <header>
        <button
          class="mobile-toggle"
          aria-label="Abrir menu"
          @click="mobile = !mobile"
        >
          <Menu /></button
        ><span
          >Meu espaço <ChevronRight :size="13" />
          <strong>{{ title }}</strong></span
        >
        <div>
          <span class="live-dot"></span>Seu ritmo. Sua aprovação.<span
            class="avatar"
            >{{ state?.profile.name?.charAt(0) || "G" }}</span
          >
        </div>
      </header>
      <main v-if="query.isLoading.value" class="loading">
        Preparando seu espaço de estudo…
      </main>
      <main v-else-if="query.isError.value" class="loading">
        <h1>Não foi possível conectar.</h1>
        <p>Verifique se a API e o PostgreSQL estão em execução.</p>
        <Button @click="query.refetch()">Tentar novamente</Button>
      </main>
      <main v-else-if="state">
        <div v-if="notice" role="alert" class="alert">
          {{ notice
          }}<button aria-label="Fechar aviso" @click="notice = ''">×</button>
        </div>
        <template v-if="route.path === '/'">
          <div class="page-heading">
            <div>
              <div class="eyebrow">
                {{
                  new Date(today() + "T12:00:00").toLocaleDateString("pt-BR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })
                }}
              </div>
              <h1>
                {{
                  state.profile.name
                    ? `Bom estudo, ${state.profile.name.split(" ")[0]}.`
                    : "Sua aprovação começa aqui."
                }}
                <span class="sun">✳</span>
              </h1>
              <p>Menos decisões. Mais foco no que faz você avançar.</p>
            </div>
            <Button variant="outline" @click="router.push('/plano')"
              ><CalendarDays :size="16" /> Ver meu plano
              <ArrowUpRight :size="15"
            /></Button>
          </div>
          <div v-if="!state.profile.configured" class="onboarding">
            <div>
              <span class="eyebrow"
                >PRIMEIRO, UM PLANO QUE CABE NA SUA VIDA</span
              >
              <h2>Qual é o seu próximo destino?</h2>
              <p>
                Defina seu concurso e suas horas reais. O resto começa a se
                organizar.
              </p>
            </div>
            <Button @click="router.push('/configuracoes')"
              >Configurar meu plano <ArrowRight :size="16"
            /></Button>
          </div>
          <div class="stats">
            <article>
              <span>Tempo de estudo <Clock :size="17" /></span
              ><strong
                >{{ Math.floor(weekMinutes / 60) }}<small>h</small>
                {{ weekMinutes % 60 }}<small>min</small></strong
              >
              <p>de {{ state.profile.hours }}h na meta semanal</p>
            </article>
            <article>
              <span>Questões resolvidas <NotebookPen :size="17" /></span
              ><strong>{{ totals.questions }}<small> questões</small></strong>
              <p>Cada correção é um passo à frente</p>
            </article>
            <article>
              <span>Aproveitamento <Target :size="17" /></span
              ><strong>{{ totals.questions ? accuracy + "%" : "—" }}</strong>
              <p>
                {{
                  totals.questions
                    ? "Acertos sobre questões registradas"
                    : "Seu resultado aparecerá aqui"
                }}
              </p>
            </article>
            <article>
              <span>Revisões para hoje <RotateCcw :size="17" /></span
              ><strong>{{ due.length }}<small> pendentes</small></strong>
              <p>
                {{
                  due.length
                    ? "Vamos manter o conhecimento vivo?"
                    : "Tudo em dia. Continue no seu ritmo."
                }}
              </p>
            </article>
          </div>
          <div class="dashboard-grid">
            <div>
              <section class="card daily">
                <div class="section-title">
                  <h2>Seu próximo passo</h2>
                  <span class="pill">{{ currentPhase }}</span>
                </div>
                <div class="next-study">
                  <div class="book-tile"><BookOpen :size="28" /></div>
                  <div>
                    <span class="eyebrow">{{
                      suggested.kind === "rest"
                        ? "DESCANSAR TAMBÉM É ESTUDAR"
                        : suggested.kind === "review"
                          ? "RECUPERE O QUE APRENDEU"
                          : suggested.kind === "active"
                            ? "CICLO ATIVO"
                            : "CONSTRUA SEU MAPA"
                    }}</span>
                    <h3>
                      {{
                        suggested.kind === "rest"
                          ? "Hoje é dia de recarregar."
                          : suggested.kind === "review"
                            ? "Sua revisão está esperando."
                            : "subject" in suggested
                              ? suggested.subject?.name
                              : "Organize os tópicos do seu edital"
                      }}
                    </h3>
                    <p>
                      {{
                        suggested.kind === "rest"
                          ? "Feche o material. Aproveite seu domingo."
                          : "topic" in suggested
                            ? suggested.topic?.name
                            : suggested.kind === "review"
                              ? "Um pequeno toque para manter a memória viva."
                              : "Adicione os assuntos e comece pelas matérias de maior peso."
                      }}
                    </p>
                  </div>
                </div>
                <div v-if="suggested.kind !== 'rest'" class="method-strip">
                  <span
                    ><Clock :size="15" />
                    {{
                      suggested.kind === "review" ? "2–20 min" : "20–40 min"
                    }}</span
                  ><span
                    ><Check :size="15" />
                    {{
                      suggested.kind === "reading" ||
                      suggested.kind === "organize"
                        ? "Leitura sem interrupções"
                        : "Recuperação ativa"
                    }}</span
                  >
                </div>
                <p class="info-box recommendation-reason">
                  {{ suggested.reason }}
                </p>
                <Button class="full" @click="startSuggested"
                  >{{
                    suggested.kind === "rest"
                      ? "Ver minha caminhada"
                      : suggested.kind === "review"
                        ? "Fazer minha revisão"
                        : suggested.kind === "organize"
                          ? "Organizar minha preparação"
                          : "Começar minha sessão"
                  }}
                  <ArrowRight :size="16"
                /></Button>
                <p class="micro center">
                  {{
                    suggested.kind === "rest"
                      ? "Descanso e sono também consolidam a memória."
                      : suggested.kind === "reading" ||
                          suggested.kind === "organize"
                        ? "Na primeira leitura, entenda o mapa. A profundidade vem depois."
                        : "Feche o material e recupere o que sabe antes de conferir."
                  }}
                </p>
              </section>
              <section class="card">
                <div class="section-title">
                  <h2>Uma semana de cada vez</h2>
                  <span class="micro">Meta: {{ state.profile.hours }}h</span>
                </div>
                <div class="week-days">
                  <div
                    v-for="day in days"
                    :key="day.date"
                    :class="{ today: day.date === today() }"
                  >
                    <small>{{ day.label }}</small
                    ><span :class="{ done: day.minutes > 0 }"
                      ><Check v-if="day.minutes" :size="16" /><Leaf
                        v-else-if="day.label === 'Dom'"
                        :size="15"
                      /><template v-else>{{
                        Number(day.date.slice(-2))
                      }}</template></span
                    ><small>{{
                      day.minutes
                        ? day.minutes + "m"
                        : day.label === "Dom"
                          ? "Folga"
                          : "—"
                    }}</small>
                  </div>
                </div>
                <div class="rest-note">
                  <Leaf :size="16" /> Domingo é descanso. Ele também faz parte
                  do método.
                </div>
              </section>
            </div>
            <div>
              <section class="card plan-summary">
                <div class="section-title">
                  <h2>Sua jornada</h2>
                  <span class="micro">90 dias</span>
                </div>
                <div class="phase-counter">
                  <strong>{{ week }}</strong
                  ><span>de 13 semanas<br /><b>Um dia de cada vez.</b></span>
                </div>
                <div class="progress">
                  <i :style="{ width: (week / 13) * 100 + '%' }"></i>
                </div>
                <div
                  v-for="(p, i) in ['Fundação', 'Consolidação', 'Reta final']"
                  :key="p"
                  :class="['phase-row', { selected: p === currentPhase }]"
                >
                  <span>{{ i + 1 }}</span>
                  <div>
                    <strong>{{ p }}</strong
                    ><small>{{
                      [
                        "Semanas 1–6 · conhecer o terreno",
                        "Semanas 7–11 · recuperar e praticar",
                        "Semanas 12–13 · refinar e revisar",
                      ][i]
                    }}</small>
                  </div>
                  <span v-if="p === currentPhase" class="phase-dot"></span>
                </div>
                <RouterLink to="/plano" class="text-link"
                  >Explorar meu plano <ArrowRight :size="15"
                /></RouterLink>
              </section>
              <section class="quote">
                <span>“</span>
                <p>
                  Se você não fechou o material e tentou dizer, você não
                  estudou. Só reconheceu.
                </p>
                <small>RODRIGO MARENGO · O MÉTODO</small>
              </section>
            </div>
          </div>
        </template>
        <ContestsPage
          v-else-if="route.path === '/concursos'"
          :state="state"
          :pending="pending"
          :send="send"
        />
        <template v-else-if="route.path === '/configuracoes'"
          ><div class="page-heading">
            <div>
              <div class="eyebrow">COMECE PELO QUE É POSSÍVEL</div>
              <h1>Um plano do seu tamanho.</h1>
              <p>Suas horas reais são o ponto de partida.</p>
            </div>
          </div>
          <form
            class="card form-card"
            @submit.prevent="
              send({
                type: 'profile',
                profile: { ...profile, configured: true },
              }).then((ok) => {
                if (ok) router.push('/');
              })
            "
          >
            <label
              >Como podemos chamar você?<input
                v-model="profile.name"
                required
                placeholder="Seu nome"
            /></label>
            <div class="info-box">
              Seus concursos, datas de prova e editais ficam em
              <RouterLink to="/concursos">Meus concursos</RouterLink>.
            </div>
            <label
              >Início do plano<input
                v-model="profile.startDate"
                type="date"
                required
            /></label>
            <label
              >Horas disponíveis por semana<input
                v-model.number="profile.hours"
                type="number"
                min="1"
                max="70"
                required
            /></label>
            <div class="info-box">
              {{
                profile.hours < 10
                  ? "Foco nas 6 matérias de maior peso."
                  : profile.hours < 14
                    ? "Foco nas 10 matérias de maior peso."
                    : "Tempo para trabalhar as 16 matérias da coleção."
              }}
              A prioridade diária considera os seus editais e preserva as
              revisões.
            </div>
            <Button :disabled="pending"
              >Salvar meu planejamento <Check :size="16"
            /></Button></form
        ></template>
        <template v-else-if="route.path === '/materias'"
          ><div class="page-heading">
            <div>
              <div class="eyebrow">CONHEÇA O TERRENO</div>
              <h1>Matérias e tópicos.</h1>
              <p>
                Maior peso primeiro. Leia a matéria inteira antes de aprofundar.
              </p>
            </div>
            <Button @click="open('subject')"
              ><Plus :size="16" /> Nova matéria</Button
            >
          </div>
          <div class="toolbar">
            <Search :size="18" /><input
              v-model="search"
              placeholder="Buscar matéria…"
              aria-label="Buscar matéria"
            />
            <label class="sort-control">
              <ArrowUpDown :size="16" />
              <span>Ordenar por</span>
              <select v-model="subjectOrder" aria-label="Ordenar matérias">
                <option value="alphabetical">Ordem alfabética</option>
                <option value="weight">Maior peso</option>
                <option value="read-desc">Mais tópicos lidos</option>
                <option value="read-asc">Menos tópicos lidos</option>
              </select>
            </label>
            <span>{{ readCount }} de {{ totalTopics }} tópicos lidos</span>
          </div>
          <div class="subjects-grid">
            <article
              v-for="(s, index) in filteredSubjects"
              :key="s.id"
              class="card subject-card"
            >
              <div class="section-title">
                <span class="subject-number">{{
                  String(index + 1).padStart(2, "0")
                }}</span
                ><label class="weight-label"
                  >Peso-base
                  <select
                    :value="s.weight"
                    :aria-label="`Peso de ${s.name}`"
                    @change="
                      send({
                        type: 'weight',
                        id: s.id,
                        weight: Number(
                          ($event.target as HTMLSelectElement).value,
                        ),
                      })
                    "
                  >
                    <option v-for="n in 10" :key="n" :value="n">{{ n }}</option>
                  </select></label
                >
              </div>
              <h2>
                <button
                  class="edit-name"
                  @click="editSubject(s)"
                  :aria-label="`Editar ${s.name}`"
                >
                  {{ s.name }}
                </button>
              </h2>
              <a
                v-if="s.materialUrl"
                :href="s.materialUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="material-link"
                >Abrir material ↗</a
              >
              <p class="micro">
                {{ s.topics.filter((t) => t.read).length }} de
                {{ s.topics.length }} tópicos lidos
              </p>
              <div class="progress">
                <i
                  :style="{
                    width:
                      (s.topics.length
                        ? (s.topics.filter((t) => t.read).length /
                            s.topics.length) *
                          100
                        : 0) + '%',
                  }"
                ></i>
              </div>
              <div class="actions">
                <Button variant="ghost" @click="open('topicsList', s.id)"
                  ><ListTree :size="15" /> Ver tópicos ({{
                    s.topics.length
                  }})</Button
                ><Button
                  v-if="s.topics.length"
                  variant="outline"
                  @click="open('session', s.id)"
                  ><Play :size="14" /> Estudar</Button
                >
              </div>
            </article>
          </div></template
        >
        <template v-else-if="route.path === '/plano'"
          ><div class="page-heading">
            <div>
              <div class="eyebrow">DIREÇÃO PARA CADA SEMANA</div>
              <h1>Seu plano de 90 dias.</h1>
              <p>
                {{ limit }} matérias prioritárias ·
                {{ state.profile.hours }} horas por semana · domingo livre
              </p>
            </div>
          </div>
          <div class="info-box">
            {{
              focusContest?.examDate &&
              Math.ceil(
                (Date.parse(focusContest.examDate) - Date.parse(today())) /
                  86400000,
              ) <= 30
                ? "Rota curta: Revisões de Véspera → Alterações Legislativas → Julgados → Simulado."
                : "Roteiro-base da coleção. A ordem diária considera a prova mais próxima, o peso no edital e os tópicos compartilhados."
            }}
            Para 31–59 dias, o guia não define uma rota própria: ajuste o ritmo
            sem eliminar as revisões.
          </div>
          <div class="plan-layout">
            <section class="card">
              <h2>As três fases</h2>
              <div
                v-for="(w, i) in weekly"
                :key="w"
                :class="['plan-week', { current: i + 1 === week }]"
              >
                <span>{{ String(i + 1).padStart(2, "0") }}</span>
                <div>
                  <small>{{
                    i < 6 ? "FUNDAÇÃO" : i < 11 ? "CONSOLIDAÇÃO" : "RETA FINAL"
                  }}</small
                  ><strong>{{ w }}</strong>
                  <p>
                    {{
                      i < 6
                        ? "Primeira leitura · sem revisões antecipadas"
                        : i < 11
                          ? "Metade do tempo em questões + revisões"
                          : "Consolidar pontos frágeis e preparar a prova"
                    }}
                  </p>
                </div>
                <span v-if="i + 1 === week" class="pill">Agora</span>
              </div>
            </section>
            <section class="card routine">
              <h2>Sua semana-padrão</h2>
              <h3>Segunda a quinta</h3>
              <p>
                50 min de bloco principal<br />10 min de recuperação ativa<br />50
                min de questões<br />10 min de caderno de erros
              </p>
              <h3>Sexta-feira</h3>
              <p>Revisões de 7 dias e questões mistas.</p>
              <h3>Sábado</h3>
              <p>
                2h de conteúdo · 1h de revisão · 1h de questões cronometradas.
              </p>
              <h3>Domingo</h3>
              <p>Descanso de verdade.</p>
              <div class="info-box">
                Na Fundação, priorize a leitura completa. A rotina de questões e
                revisões se aplica à consolidação.
              </div>
            </section>
          </div></template
        >
        <template v-else-if="route.path === '/revisoes'"
          ><div class="page-heading">
            <div>
              <div class="eyebrow">RECUPERAR PARA NÃO ESQUECER</div>
              <h1>Conhecimento que fica.</h1>
              <p>
                Revisões automáticas em 1, 7 e 30 dias após cada ciclo ativo.
              </p>
            </div>
          </div>
          <div class="review-guide">
            <article class="card">
              <span class="pill">D + 1</span>
              <h3>Reative a memória</h3>
              <p>Caixas Memorize e Atenção.<br />2 a 3 minutos.</p>
            </article>
            <article class="card">
              <span class="pill">D + 7</span>
              <h3>Recupere sem consultar</h3>
              <p>Caixas, quadros e cinco linhas de memória. 8 a 10 minutos.</p>
            </article>
            <article class="card">
              <span class="pill">D + 30</span>
              <h3>Teste o que ficou</h3>
              <p>20 questões. Mais de 80% de acertos para sair da fila.</p>
            </article>
          </div>
          <section class="card">
            <h2>Sua fila de revisões</h2>
            <div v-if="!state.reviews.some((r) => !r.done)" class="empty">
              <RotateCcw :size="32" />
              <h3>Nenhuma revisão pendente.</h3>
              <p>
                Conclua a primeira leitura e registre um ciclo ativo. As datas
                aparecem aqui automaticamente.
              </p>
            </div>
            <div
              v-for="r in state.reviews
                .filter((r) => !r.done)
                .sort((a, b) => a.due.localeCompare(b.due))"
              :key="r.id"
              class="review-row"
            >
              <span class="review-badge">D+{{ r.interval }}</span>
              <div>
                <strong>{{
                  state.subjects
                    .find((s) => s.id === r.subjectId)
                    ?.topics.find((t) => t.id === r.topicId)?.name
                }}</strong>
                <p>
                  {{ state.subjects.find((s) => s.id === r.subjectId)?.name }} ·
                  {{ r.due.split("-").reverse().join("/") }}
                </p>
              </div>
              <span v-if="r.due < today()" class="pill warning">Atrasada</span
              ><Button variant="outline" @click="review(r.id)"
                >Revisar <ArrowRight :size="15"
              /></Button>
            </div></section
        ></template>
        <template v-else-if="route.path === '/erros'"
          ><div class="page-heading">
            <div>
              <div class="eyebrow">ERRO CORRIGIDO VIRA PONTO</div>
              <h1>Seu caderno de erros.</h1>
              <p>
                Registre a causa. Escreva a regra com suas palavras. Quebre o
                padrão.
              </p>
            </div>
            <Button @click="open('error')"
              ><Plus :size="16" /> Registrar erro</Button
            >
          </div>
          <section class="card">
            <div class="toolbar">
              <Search :size="18" /><input
                v-model="search"
                placeholder="Buscar assunto ou aprendizado…"
              />
            </div>
            <div v-if="!state.errors.length" class="empty">
              <NotebookPen :size="36" />
              <h3>Aqui, errar faz parte de avançar.</h3>
              <p>
                Depois das questões, registre o que confundiu você e qual regra
                resolve a dúvida.
              </p>
            </div>
            <div v-else class="table-scroll">
              <table>
                <thead>
                  <tr v-for="group in table.getHeaderGroups()" :key="group.id">
                    <th v-for="h in group.headers" :key="h.id">
                      <FlexRender
                        :render="h.column.columnDef.header"
                        :props="h.getContext()"
                      />
                    </th>
                    <th>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in table.getRowModel().rows" :key="row.id">
                    <td v-for="cell in row.getVisibleCells()" :key="cell.id">
                      <FlexRender
                        :render="cell.column.columnDef.cell"
                        :props="cell.getContext()"
                      />
                    </td>
                    <td>
                      <Button
                        variant="ghost"
                        :disabled="pending"
                        @click="send({ type: 'resolve', id: row.original.id })"
                        >{{
                          row.original.resolved ? "Reabrir" : "Superei"
                        }}</Button
                      >
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section></template
        >
        <template v-else-if="route.path === '/vespera'"
          ><div class="page-heading">
            <div>
              <div class="eyebrow">SÓ O QUE PRECISA SER REATIVADO</div>
              <h1>Confiança para a reta final.</h1>
              <p>
                Após três revisões seguidas sem dúvida, o lembrete sai dos
                prioritários.
              </p>
            </div>
            <Button @click="open('reminder')"
              ><Plus :size="16" /> Novo lembrete</Button
            >
          </div>
          <div class="info-box">
            Nas 48 horas antes da prova: matérias de maior peso primeiro, depois
            as demais e atualizações. Na noite anterior, pare. Na manhã da
            prova, só itens marcados, por até 30 minutos.
          </div>
          <div v-if="!state.reminders.length" class="card empty">
            <Flag :size="36" />
            <h3>Monte sua lista de pontos essenciais.</h3>
            <p>
              Ao terminar um volume, traga os lembretes que ainda causam dúvida.
            </p>
          </div>
          <div class="subjects-grid">
            <article
              v-for="r in [...state.reminders].sort(
                (a, b) => Number(b.marked) - Number(a.marked),
              )"
              :key="r.id"
              class="card"
            >
              <div class="section-title">
                <span class="pill">{{
                  {
                    memorize: "Memorize",
                    attention: "Atenção",
                    jurisprudence: "Jurisprudência",
                    observation: "Observação",
                  }[r.kind]
                }}</span
                ><Flag v-if="r.marked" :size="16" />
              </div>
              <p>{{ r.text }}</p>
              <small
                >{{ state.subjects.find((s) => s.id === r.subjectId)?.name }} ·
                {{ r.streak }}/3 sem dúvida</small
              >
              <div class="actions">
                <Button
                  variant="outline"
                  :disabled="pending"
                  @click="send({ type: 'remember', id: r.id, known: false })"
                  >Ainda tenho dúvida</Button
                ><Button
                  :disabled="pending"
                  @click="send({ type: 'remember', id: r.id, known: true })"
                  >Lembrei</Button
                >
              </div>
            </article>
          </div></template
        >
        <template v-else-if="route.path === '/progresso'"
          ><div class="page-heading">
            <div>
              <div class="eyebrow">EVIDÊNCIAS DO SEU CAMINHO</div>
              <h1>Pequenos passos, progresso real.</h1>
              <p>
                Resultados calculados a partir das suas sessões registradas.
              </p>
            </div>
            <Button variant="outline" @click="exportData"
              ><Download :size="16" /> Exportar dados</Button
            >
          </div>
          <div class="stats">
            <article>
              <span>Horas acumuladas</span
              ><strong>{{ (totals.minutes / 60).toFixed(1) }}h</strong>
            </article>
            <article>
              <span>Questões</span><strong>{{ totals.questions }}</strong>
            </article>
            <article>
              <span>Acertos</span><strong>{{ accuracy }}%</strong>
            </article>
            <article>
              <span>Tópicos lidos</span
              ><strong>{{ readCount }} / {{ totalTopics }}</strong>
            </article>
          </div>
          <section class="card">
            <h2>Desempenho por matéria</h2>
            <div v-for="s in ranked" :key="s.id" class="performance-row">
              <span>{{ s.name }}</span>
              <div class="progress">
                <i
                  :style="{
                    width:
                      (s.topics.length
                        ? (s.topics.filter((t) => t.read).length /
                            s.topics.length) *
                          100
                        : 0) + '%',
                  }"
                />
              </div>
              <small
                >{{ s.topics.filter((t) => t.read).length }}/{{
                  s.topics.length
                }}
                lidos</small
              >
            </div>
          </section>
          <section class="card">
            <h2>Histórico de sessões</h2>
            <div v-if="!state.sessions.length" class="empty">
              <Clock />
              <p>Seu histórico começa na primeira sessão.</p>
            </div>
            <div
              v-for="s in [...state.sessions].reverse()"
              :key="s.id"
              class="review-row"
            >
              <span>{{ s.date.split("-").reverse().join("/") }}</span>
              <div>
                <strong>{{
                  state.subjects.find((x) => x.id === s.subjectId)?.name
                }}</strong>
                <p>
                  {{
                    s.kind === "reading"
                      ? "Primeira leitura"
                      : s.kind === "active"
                        ? "Ciclo ativo"
                        : "Questões / simulado"
                  }}
                  · {{ s.minutes }} min · {{ s.correct }}/{{ s.questions }}
                  acertos
                </p>
              </div>
            </div>
          </section></template
        >
        <footer>
          Feito para estudar com direção.
          <span>Uma rotina modesta. Repetida com constância.</span>
        </footer>
      </main>
    </div>
    <DialogRoot
      :open="!!modal"
      @update:open="
        (v) => {
          if (!v) modal = '';
        }
      "
      ><DialogPortal
        ><DialogOverlay class="dialog-overlay" /><DialogContent
          class="dialog-content"
          ><DialogTitle class="dialog-title">{{ modalTitle }}</DialogTitle
          ><DialogDescription v-if="modalDescription" class="micro">{{
            modalDescription
          }}</DialogDescription
          ><DialogClose class="dialog-close" aria-label="Fechar janela"
            ><X :size="20"
          /></DialogClose>
          <div v-if="modal === 'topicsList'" class="topic-manager">
            <div v-if="!activeSubject?.topics.length" class="empty compact">
              <ListTree :size="30" />
              <h3>Nenhum tópico cadastrado.</h3>
              <p>Adicione os conteúdos na ordem em que pretende estudá-los.</p>
            </div>
            <ol v-else class="topic-manager-list">
              <li
                v-for="(topic, index) in activeSubject?.topics"
                :key="topic.id"
                :data-topic-id="topic.id"
                :class="{
                  dragging: draggedTopicId === topic.id,
                  'drag-over': dragOverTopicId === topic.id,
                }"
                @dragover.prevent="dragOverTopicId = topic.id"
                @drop.prevent="dropTopic($event, topic.id)"
              >
                <span class="topic-position">{{ index + 1 }}</span>
                <button
                  type="button"
                  class="topic-drag-handle"
                  draggable="true"
                  :aria-label="`Reposicionar ${topic.name}`"
                  @dragstart="beginTopicDrag($event, topic.id)"
                  @dragend="
                    draggedTopicId = '';
                    dragOverTopicId = '';
                  "
                  @pointerdown="beginPointerTopicDrag($event, topic.id)"
                  @pointermove="trackPointerTopicDrag"
                  @pointerup="finishPointerTopicDrag"
                  @pointercancel="
                    draggedTopicId = '';
                    dragOverTopicId = '';
                  "
                >
                  <GripVertical :size="17" />
                </button>
                <button
                  type="button"
                  class="edit-name topic-manager-name"
                  @click="editTopic(activeSubject!, topic)"
                >
                  {{ topic.name }}
                </button>
              </li>
            </ol>
            <p v-if="notice" role="alert" class="error-message">
              {{ notice }}
            </p>
            <div class="topic-manager-footer">
              <Button
                type="button"
                :disabled="pending"
                @click="open('topic', subjectId)"
                ><Plus :size="15" /> Adicionar tópicos</Button
              >
              <Button type="button" variant="outline" @click="modal = ''"
                >Fechar</Button
              >
            </div>
          </div>
          <form v-else @submit.prevent="save">
            <label
              v-if="
                ![
                  'subject',
                  'topic',
                  'review',
                  'editSubject',
                  'editTopic',
                ].includes(modal)
              "
              >Matéria<select
                v-model="subjectId"
                required
                @change="topicId = activeSubject?.topics[0]?.id ?? ''"
              >
                <option v-for="s in ranked" :key="s.id" :value="s.id">
                  {{ s.name }}
                </option>
              </select></label
            ><label
              v-if="
                ['subject', 'error', 'editSubject', 'editTopic'].includes(modal)
              "
              >{{ modal === "error" ? "Assunto da questão" : "Nome"
              }}<input v-model="name" required maxlength="200" /></label
            ><label v-if="modal === 'topic'"
              >Tópicos <small>um por linha</small
              ><textarea
                v-model="name"
                required
                rows="6"
                placeholder="Ex.: Atos administrativos&#10;Poderes administrativos&#10;Licitações"
              /></label
            ><label v-if="modal === 'editSubject'"
              >Link do material principal<input
                v-model="source"
                type="url"
                placeholder="https://…" /></label
            ><label v-if="modal === 'subject'"
              >Peso no edital<input
                v-model.number="weight"
                type="number"
                min="1"
                max="10"
                required
            /></label>
            <template v-if="modal === 'session'"
              ><label
                >Tópico<select v-model="topicId" required>
                  <option
                    v-for="t in activeSubject?.topics"
                    :key="t.id"
                    :value="t.id"
                  >
                    {{ t.name }}
                  </option>
                </select></label
              ><label
                >Tipo de sessão<select v-model="kind">
                  <option value="reading">
                    Primeira leitura — conhecer o terreno
                  </option>
                  <option value="active">
                    Ciclo ativo — recuperar, conferir, praticar
                  </option>
                  <option value="mock">Questões / simulado cronometrado</option>
                </select></label
              >
              <div class="timer">
                <button
                  type="button"
                  @click="timer.running = !timer.running"
                  :aria-label="
                    timer.running ? 'Pausar cronômetro' : 'Iniciar cronômetro'
                  "
                >
                  <Pause v-if="timer.running" :size="18" /><Play
                    v-else
                    :size="18"
                  /></button
                ><strong>{{ time }}</strong
                ><button
                  type="button"
                  @click="minutes = Math.max(1, Math.ceil(timer.seconds / 60))"
                >
                  Usar tempo
                </button>
              </div>
              <label
                >Duração em minutos<input
                  v-model.number="minutes"
                  type="number"
                  min="1"
                  max="600"
                  required /></label
              ><template v-if="kind === 'active'"
                ><div class="info-box">
                  1. Feche o material. 2. Escreva cinco linhas. 3. Confira as
                  lacunas. 4. Leia Memorize e Atenção. 5. Faça 20–30 questões.
                  6. Registre os erros.
                </div>
                <label
                  >Cinco linhas de memória<textarea
                    v-model="recall"
                    rows="5"
                    required
                    placeholder="Sem consultar: o que você consegue explicar?"
                  /></label></template
            ></template>
            <template
              v-if="
                (modal === 'session' && kind !== 'reading') ||
                modal === 'review'
              "
              ><div v-if="modal === 'review'" class="info-box">
                D+1: caixas de destaque. D+7: caixas, quadros e cinco linhas de
                memória. D+30: ao menos 20 questões. Preencha os resultados após
                revisar.
              </div>
              <div class="form-row">
                <label
                  >Questões<input
                    v-model.number="questions"
                    type="number"
                    min="0"
                    max="1000"
                    required /></label
                ><label
                  >Acertos<input
                    v-model.number="correct"
                    type="number"
                    min="0"
                    :max="questions"
                    required
                /></label></div
            ></template>
            <template v-if="modal === 'error'"
              ><label
                >Por que você errou?<select v-model="reason" required>
                  <option value="" disabled>Selecione a causa</option>
                  <option>Não conhecia a regra</option>
                  <option>Confundi conceitos</option>
                  <option>Desatenção ao enunciado</option>
                  <option>Esqueci uma exceção</option>
                  <option>Gestão do tempo</option>
                </select></label
              ><label
                >Qual é a regra correta, com suas palavras?<textarea
                  v-model="rule"
                  required
                  rows="3"
                /></label
              ><label
                >Fonte / referência da questão<input
                  v-model="source"
                  placeholder="Banca, ano ou link" /></label
            ></template>
            <template v-if="modal === 'reminder'"
              ><label
                >Tipo de destaque<select v-model="reminderKind">
                  <option value="memorize">Memorize</option>
                  <option value="attention">Atenção</option>
                  <option value="jurisprudence">Jurisprudência</option>
                  <option value="observation">Observação</option>
                </select></label
              ><label
                >O que você precisa lembrar?<textarea
                  v-model="rule"
                  rows="4"
                  required
                /></label
            ></template>
            <p v-if="notice" role="alert" class="error-message">{{ notice }}</p>
            <Button class="full" :disabled="pending"
              >{{
                pending
                  ? "Salvando…"
                  : modal === "session"
                    ? "Concluir e salvar sessão"
                    : "Salvar"
              }}
              <Check :size="16"
            /></Button></form></DialogContent></DialogPortal
    ></DialogRoot>
  </div>
</template>
