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
      v-if="props.frontmatter.cloudOnly"
      type="warning"
      text="Cloud only"
    />
    <Badge
      v-if="!props.frontmatter.implemented"
      type="warning"
      text="Not implemented"
    />
  </div>
</template>
