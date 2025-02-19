<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  id: string;
}>();

const bindingLink = computed(() => {
  return `https://github.com/fastrepl/hypr/blob/main/plugins/${props.id}/generated/bindings.ts`;
});

const packageName = computed(() => {
  return `@hypr/${props.id}`;
});
</script>

<template>
  <a :href="bindingLink"><code>{{ packageName }}</code> Typescript API</a>
</template>
