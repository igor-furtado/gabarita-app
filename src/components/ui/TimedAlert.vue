<script setup lang="ts">
import { CheckCircle2, CircleAlert, X } from '@lucide/vue'
import { useTimeoutFn } from '@vueuse/core'
import type { FeedbackAlert } from '@/stores/feedback'

const props = defineProps<{ alert: FeedbackAlert }>()
const emit = defineEmits<{ dismiss: [] }>()

useTimeoutFn(() => emit('dismiss'), props.alert.duration)
</script>

<template>
  <li
    role="alert"
    :data-variant="alert.variant"
    class="pointer-events-auto relative w-full overflow-hidden rounded-xl border bg-white p-4 pr-11 shadow-xl shadow-slate-900/10"
    :class="alert.variant === 'error' ? 'border-red-200' : 'border-emerald-200'"
  >
    <div class="flex items-start gap-3">
      <CircleAlert
        v-if="alert.variant === 'error'"
        class="mt-0.5 size-5 shrink-0 text-red-700"
        aria-hidden="true"
      />
      <CheckCircle2 v-else class="mt-0.5 size-5 shrink-0 text-emerald-700" aria-hidden="true" />
      <p class="text-sm font-semibold leading-5 text-slate-800">{{ alert.message }}</p>
    </div>
    <button
      type="button"
      class="absolute right-2 top-2 rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2"
      :class="
        alert.variant === 'error' ? 'focus-visible:ring-red-600' : 'focus-visible:ring-emerald-600'
      "
      aria-label="Fechar alerta"
      @click="emit('dismiss')"
    >
      <X class="size-4" />
    </button>
    <div
      class="absolute inset-x-0 bottom-0 h-1"
      :class="alert.variant === 'error' ? 'bg-red-100' : 'bg-emerald-100'"
      role="progressbar"
      aria-label="Tempo restante do alerta"
    >
      <span
        class="block h-full origin-left"
        :class="alert.variant === 'error' ? 'bg-red-600' : 'bg-emerald-600'"
        :style="{ animation: `alert-progress ${alert.duration}ms linear forwards` }"
      />
    </div>
  </li>
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
