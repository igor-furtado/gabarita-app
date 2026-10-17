import { ref } from 'vue'
import { defineStore } from 'pinia'

export interface FeedbackAlert {
  id: string
  message: string
  duration: number
}

export const useFeedbackStore = defineStore('feedback', () => {
  const alerts = ref<FeedbackAlert[]>([])

  function success(message: string, duration = 5_000) {
    alerts.value.push({ id: crypto.randomUUID(), message, duration })
  }

  function dismiss(id: string) {
    alerts.value = alerts.value.filter((alert) => alert.id !== id)
  }

  return { alerts, success, dismiss }
})
