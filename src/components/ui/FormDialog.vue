<script setup lang="ts">
import {
  DialogContent,
  DialogClose,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from 'reka-ui'
import Button from '@/components/ui/Button.vue'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    title: string
    description: string
    submitLabel: string
    contentClass?: string
    formClass?: string
    actionsClass?: string
  }>(),
  { contentClass: '', formClass: '', actionsClass: '' },
)
const emit = defineEmits<{ submit: [] }>()
const open = defineModel<boolean>({ default: false })
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogTrigger as-child><slot name="trigger" /></DialogTrigger>
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-40 bg-slate-950/40" />
      <DialogContent
        :class="
          cn(
            'fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl',
            props.contentClass,
          )
        "
      >
        <DialogTitle class="text-xl font-bold">{{ title }}</DialogTitle>
        <DialogDescription class="mt-1 text-sm text-slate-500">{{ description }}</DialogDescription>
        <form :class="cn('mt-6', props.formClass)" @submit.prevent="emit('submit')">
          <slot />
          <div :class="cn('mt-2 flex justify-end gap-3', props.actionsClass)">
            <DialogClose as-child><Button variant="secondary">Cancelar</Button></DialogClose>
            <Button type="submit">{{ submitLabel }}</Button>
          </div>
        </form>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
