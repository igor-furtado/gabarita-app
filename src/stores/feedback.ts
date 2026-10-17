import { ref } from 'vue'
import { defineStore } from 'pinia'

export interface FeedbackAlert {
  id: string
  message: string
  duration: number
  variant: 'success' | 'error'
}

export const useFeedbackStore = defineStore('feedback', () => {
  const alerts = ref<FeedbackAlert[]>([])

  function show(message: string, variant: FeedbackAlert['variant'], duration: number) {
    alerts.value.push({ id: crypto.randomUUID(), message, duration, variant })
  }

  function success(message: string, duration = 5_000) {
    show(message, 'success', duration)
  }

  function error(message: string, duration = 7_000) {
    show(message, 'error', duration)
  }

  function dismiss(id: string) {
    alerts.value = alerts.value.filter((alert) => alert.id !== id)
  }

  return { alerts, success, error, dismiss }
})
