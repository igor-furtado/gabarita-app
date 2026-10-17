<script setup lang="ts">
import { CheckCircle2, X } from '@lucide/vue'
import { useTimeoutFn } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import { useFeedbackStore } from '@/stores/feedback'

const feedback = useFeedbackStore()
const { alerts } = storeToRefs(feedback)

function scheduleDismiss(id: string, duration: number) {
  useTimeoutFn(() => feedback.dismiss(id), duration)
}
</script>

<template>
  <Teleport to="body">
    <ol
      class="pointer-events-none fixed inset-x-4 bottom-4 z-[100] flex flex-col items-end gap-3 sm:left-auto sm:w-full sm:max-w-sm"
      aria-label="Notificações"
    >
      <li
        v-for="alert in alerts"
        :key="alert.id"
        role="alert"
        class="pointer-events-auto relative w-full overflow-hidden rounded-xl border border-emerald-200 bg-white p-4 pr-11 shadow-xl shadow-slate-900/10"
        @vue:mounted="scheduleDismiss(alert.id, alert.duration)"
      >
        <div class="flex items-start gap-3">
          <CheckCircle2 class="mt-0.5 size-5 shrink-0 text-emerald-700" aria-hidden="true" />
          <p class="text-sm font-semibold leading-5 text-slate-800">{{ alert.message }}</p>
        </div>
        <button
          type="button"
          class="absolute right-2 top-2 rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
          aria-label="Fechar alerta"
          @click="feedback.dismiss(alert.id)"
        >
          <X class="size-4" />
        </button>
        <div
          class="absolute inset-x-0 bottom-0 h-1 bg-emerald-100"
          role="progressbar"
          aria-label="Tempo restante do alerta"
        >
          <span
            class="block h-full origin-left bg-emerald-600 motion-reduce:hidden"
            :style="{ animation: `alert-progress ${alert.duration}ms linear forwards` }"
          />
        </div>
      </li>
    </ol>
  </Teleport>
</template>

<style>
@keyframes alert-progress {
  from {
    transform: scaleX(1);
  }
  to {
    transform: scaleX(0);
  }
}
</style>
