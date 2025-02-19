<script setup lang="ts">
const props = defineProps<{
  plugin: string;
}>();
</script>

<template>
  <a :href="`/plugins/${plugin}`"><code>Plugin</code> {{ plugin }}</a>
</template>
