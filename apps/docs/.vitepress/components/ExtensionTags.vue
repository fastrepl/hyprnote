<script setup lang="ts">
import type { ExtensionFrontmatter } from "../types";

const props = defineProps<{
  frontmatter: ExtensionFrontmatter;
}>();
</script>

<template>
  <div class="flex gap-2">
    <Badge v-if="props.frontmatter.default" type="tip" text="Default" />
    <Badge
      v-if="props.frontmatter.cloud_only"
      type="warning"
      text="Cloud only"
    />
    <Badge
      v-if="!props.frontmatter.implemented"
      type="warning"
      text="Not implemented"
    />
    <Badge
      v-for="tag in props.frontmatter.tags"
      :key="tag"
      type="default"
      :text="tag.charAt(0).toUpperCase() + tag.slice(1)"
      class="border border-gray-200 dark:border-gray-700"
    />
  </div>
</template>
