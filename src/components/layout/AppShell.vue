<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { BookOpenCheck, Building2, CalendarDays, LibraryBig } from '@lucide/vue'
import { useRoute } from 'vue-router'
import AlertViewport from '@/components/ui/AlertViewport.vue'

const route = useRoute()
const scrollPanel = ref<HTMLElement>()

watch(
  () => route.fullPath,
  async () => {
    await nextTick()
    scrollPanel.value?.scrollTo({ top: 0 })
  },
)

const links = [
  { to: '/concursos', label: 'Concursos', icon: Building2 },
  { to: '/disciplinas', label: 'Disciplinas', icon: LibraryBig },
  { to: '/calendario', label: 'Calendário', icon: CalendarDays },
]
</script>

<template>
  <div class="h-dvh overflow-hidden md:grid md:grid-cols-[240px_1fr]">
    <aside
      class="sticky top-0 hidden h-screen self-start border-r border-slate-200 bg-white md:flex md:flex-col"
    >
      <RouterLink
        to="/concursos"
        class="flex h-20 items-center gap-3 border-b px-6 text-xl font-black tracking-tight text-slate-950"
      >
        <span class="grid size-9 place-items-center rounded-lg bg-emerald-700 text-white"
          ><BookOpenCheck class="size-5" /></span
        >Gabarita
      </RouterLink>
      <nav aria-label="Navegação principal" class="space-y-1 p-4">
        <RouterLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
          active-class="!bg-emerald-50 !text-emerald-800"
        >
          <component :is="link.icon" class="size-4" aria-hidden="true" />{{ link.label }}
        </RouterLink>
      </nav>
      <p class="mt-auto px-6 pb-6 text-xs leading-5 text-slate-400">
        Organize seus estudos<br />para passar.
      </p>
    </aside>
    <div
      ref="scrollPanel"
      class="h-dvh min-w-0 overflow-y-auto overscroll-y-none"
      role="region"
      aria-label="Conteúdo principal"
    >
      <header class="sticky top-0 z-30 border-b bg-white/95 backdrop-blur md:hidden">
        <div class="flex h-14 items-center justify-between px-4">
          <RouterLink to="/concursos" class="flex items-center gap-2 font-black"
            ><BookOpenCheck class="size-5 text-emerald-700" />Gabarita</RouterLink
          >
        </div>
        <nav aria-label="Navegação principal" class="flex overflow-x-auto px-2 pb-2">
          <RouterLink
            v-for="link in links"
            :key="link.to"
            :to="link.to"
            class="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600"
            active-class="!bg-emerald-50 !text-emerald-800"
            ><component :is="link.icon" class="size-4" />{{ link.label }}</RouterLink
          >
        </nav>
      </header>
      <main class="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-10"><RouterView /></main>
    </div>
    <AlertViewport />
  </div>
</template>
