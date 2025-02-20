<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  id: string;
}>();

const sourceLink = computed(() => {
  return `https://github.com/fastrepl/hypr/tree/main/plugins/${props.id}`;
});

const bindingLink = computed(() => {
  return `https://github.com/fastrepl/hypr/blob/main/plugins/${props.id}/js/bindings.gen.ts`;
});

const packageName = computed(() => {
  return `@hypr/${props.id}`;
});
</script>

<template>
  <li><a :href="sourceLink">Github source</a></li>
  <li>
    <a :href="bindingLink"><code>{{ packageName }}</code> Typescript API</a>
  </li>
</template>
