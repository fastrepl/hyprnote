<script setup lang="ts">
import { h, withDirectives } from "vue";
import { vTooltip as tooltip } from "floating-vue";
import { createColumnHelper } from "@tanstack/vue-table";

import BaseTable from "./BaseTable.vue";

const props = defineProps<{
  data: Array<{
    url: string;
    frontmatter: {
      title: string;
      description: string;
    };
  }>;
}>();

const columnHelper = createColumnHelper<any>();

const columns = [
  columnHelper.accessor("frontmatter.title", {
    header: "Plugin",
    cell: (info) =>
      withDirectives(
        h(
          "a",
          {
            href: info.row.original.url,
          },
          info.getValue(),
        ),
        [[tooltip, info.row.original.frontmatter.description]],
      ),
  }),
];
</script>

<template>
  <BaseTable :data="data" :columns="columns" />
</template>
