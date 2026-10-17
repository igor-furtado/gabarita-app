<script setup lang="ts">
defineProps<{ title: string; description: string; eyebrow?: string }>()
</script>
<template>
  <header class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <p v-if="eyebrow" class="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
        {{ eyebrow }}
      </p>
      <h1 class="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{{ title }}</h1>
      <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{{ description }}</p>
    </div>
    <div class="shrink-0"><slot /></div>
  </header>
</template>
