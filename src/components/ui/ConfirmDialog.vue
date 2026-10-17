<script setup lang="ts">
import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogRoot,
  AlertDialogTitle,
  AlertDialogTrigger,
} from 'reka-ui'
defineProps<{ title: string; description: string }>()
const emit = defineEmits<{ confirm: [] }>()
</script>
<template>
  <AlertDialogRoot
    ><AlertDialogTrigger as-child><slot /></AlertDialogTrigger
    ><AlertDialogPortal
      ><AlertDialogOverlay class="fixed inset-0 z-40 bg-slate-950/40" /><AlertDialogContent
        class="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl"
        ><AlertDialogTitle class="text-lg font-bold text-slate-950">{{ title }}</AlertDialogTitle
        ><AlertDialogDescription class="mt-2 text-sm leading-6 text-slate-600">{{
          description
        }}</AlertDialogDescription>
        <div class="mt-6 flex justify-end gap-3">
          <AlertDialogCancel
            class="h-10 rounded-lg border border-slate-300 px-4 text-sm font-semibold"
            >Cancelar</AlertDialogCancel
          ><AlertDialogAction
            class="h-10 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white"
            @click="emit('confirm')"
            >Excluir</AlertDialogAction
          >
        </div></AlertDialogContent
      ></AlertDialogPortal
    ></AlertDialogRoot
  >
</template>
