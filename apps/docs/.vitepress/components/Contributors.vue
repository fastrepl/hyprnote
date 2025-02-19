<script setup lang="ts">
import type { Contributor } from "../../data/contributors.data.mts";

const props = defineProps<{
  data: Contributor[];
}>();

const PLACEHOLDER_AVATAR = "https://www.gravatar.com/avatar/?d=mp";
</script>

<template>
  <div class="flex -space-x-4 rtl:space-x-reverse">
    <img
      v-for="contributor in props.data"
      :key="contributor.name"
      class="w-10 h-10 border-2 border-white rounded-full dark:border-gray-800"
      :src="contributor.avatar || PLACEHOLDER_AVATAR"
      :alt="contributor.name"
      v-tooltip="contributor.name"
    >
  </div>
</template>
