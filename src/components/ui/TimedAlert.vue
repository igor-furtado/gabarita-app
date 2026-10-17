<script setup lang="ts">
import { computed, ref } from 'vue'
import { CheckCircle2, CircleAlert, X } from '@lucide/vue'
import { useIntervalFn } from '@vueuse/core'
import type { FeedbackAlert } from '@/stores/feedback'

const props = defineProps<{ alert: FeedbackAlert }>()
const emit = defineEmits<{ dismiss: [] }>()
const remaining = ref(props.alert.duration)
const hovered = ref(false)
const focused = ref(false)
const progress = computed(() => Math.round((remaining.value / props.alert.duration) * 100))

const { pause, resume } = useIntervalFn(() => {
  remaining.value = Math.max(0, remaining.value - 100)
  if (remaining.value === 0) {
    pause()
    emit('dismiss')
  }
}, 100)

function syncTimer() {
  if (hovered.value || focused.value) pause()
  else resume()
}

function setHovered(value: boolean) {
  hovered.value = value
  syncTimer()
}

function setFocused(value: boolean) {
  focused.value = value
  syncTimer()
}
</script>

<template>
  <li
    role="alert"
    :data-variant="alert.variant"
    class="pointer-events-auto relative w-full overflow-hidden rounded-xl border bg-white p-4 pr-11 shadow-xl shadow-slate-900/10"
    :class="alert.variant === 'error' ? 'border-red-200' : 'border-emerald-200'"
    @mouseenter="setHovered(true)"
    @mouseleave="setHovered(false)"
    @focusin="setFocused(true)"
    @focusout="setFocused(false)"
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
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-valuenow="progress"
    >
      <span
        class="block h-full origin-left"
        :class="alert.variant === 'error' ? 'bg-red-600' : 'bg-emerald-600'"
        :style="{ width: `${progress}%` }"
      />
    </div>
  </li>
</template>
