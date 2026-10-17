<script setup lang="ts">
import type { ButtonHTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
    size?: 'sm' | 'md'
    type?: ButtonHTMLAttributes['type']
    class?: string
  }>(),
  { variant: 'primary', size: 'md', type: 'button', class: '' },
)
const variants = {
  primary: 'bg-emerald-700 text-white hover:bg-emerald-800',
  secondary: 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50',
  ghost: 'text-slate-600 hover:bg-slate-100',
  danger: 'bg-red-600 text-white hover:bg-red-700',
}
</script>

<template>
  <button
    :type="props.type"
    :class="
      cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
        variants[props.variant],
        props.size === 'sm' ? 'h-8 px-3 text-xs' : 'h-10 px-4 text-sm',
        props.class,
      )
    "
  >
    <slot />
  </button>
</template>
