<script setup lang="ts">
import { Inbox } from '@lucide/vue'
defineProps<{ title: string; description: string }>()
</script>
<template>
  <div
    class="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center"
  >
    <Inbox class="mb-3 size-8 text-slate-400" aria-hidden="true" />
    <h3 class="font-semibold text-slate-900">{{ title }}</h3>
    <p class="mt-1 max-w-sm text-sm text-slate-500">{{ description }}</p>
    <div class="mt-4"><slot /></div>
  </div>
</template>
