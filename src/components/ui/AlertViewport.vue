<script setup lang="ts">
import { storeToRefs } from 'pinia'
import TimedAlert from '@/components/ui/TimedAlert.vue'
import { useFeedbackStore } from '@/stores/feedback'

const feedback = useFeedbackStore()
const { alerts } = storeToRefs(feedback)
</script>

<template>
  <Teleport to="body">
    <ol
      class="pointer-events-none fixed inset-x-4 bottom-4 z-[100] flex flex-col items-end gap-3 sm:left-auto sm:w-full sm:max-w-sm"
      aria-label="Notificações"
    >
      <TimedAlert
        v-for="alert in alerts"
        :key="alert.id"
        :alert="alert"
        @dismiss="feedback.dismiss(alert.id)"
      />
    </ol>
  </Teleport>
</template>
