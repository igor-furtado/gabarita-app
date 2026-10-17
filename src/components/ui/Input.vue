<script setup lang="ts">
import { useVModel } from '@vueuse/core'
import { cn } from '@/lib/utils'
const props = defineProps<{
  modelValue?: string | number
  type?: string
  required?: boolean
  placeholder?: string
  class?: string
  min?: string | number
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const value = useVModel(props, 'modelValue', emit)
</script>
<template>
  <input
    v-model="value"
    :type="type ?? 'text'"
    :required="required"
    :placeholder="placeholder"
    :min="min"
    :class="
      cn(
        'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100',
        props.class,
      )
    "
  />
</template>
