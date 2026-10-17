<script setup lang="ts">
defineProps<{ tone?: 'neutral' | 'green' | 'amber' | 'red' }>()
</script>
<template>
  <span
    :class="[
      'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold',
      tone === 'green'
        ? 'bg-emerald-100 text-emerald-800'
        : tone === 'amber'
          ? 'bg-amber-100 text-amber-800'
          : tone === 'red'
            ? 'bg-red-100 text-red-700'
            : 'bg-slate-100 text-slate-700',
    ]"
    ><slot
  /></span>
</template>
