<script setup lang="ts">
import { Primitive, type PrimitiveProps } from "reka-ui";
import { cva } from "class-variance-authority";
import { cn } from "../../../lib/utils";
import type { HTMLAttributes } from "vue";
withDefaults(
  defineProps<
    PrimitiveProps & {
      variant?: "default" | "outline" | "ghost";
      class?: HTMLAttributes["class"];
    }
  >(),
  { as: "button", variant: "default", class: undefined },
);
const variants = cva("button", {
  variants: {
    variant: {
      default: "button-primary",
      outline: "button-outline",
      ghost: "button-ghost",
    },
  },
});
</script>
<template>
  <Primitive
    :as="as"
    :as-child="asChild"
    :class="cn(variants({ variant }), $props.class)"
    ><slot
  /></Primitive>
</template>
