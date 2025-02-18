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
      implemented: boolean;
      default: boolean;
      cloudOnly: boolean;
    };
  }>;
}>();

const columnHelper = createColumnHelper<any>();

const columns = [
  columnHelper.accessor("frontmatter.title", {
    header: "Extension",
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
  columnHelper.accessor("frontmatter.implemented", {
    header: "Implemented",
    cell: (info) =>
      info.getValue() ? h("div", { class: "i-heroicons-check" }) : null,
  }),
  columnHelper.accessor("frontmatter.default", {
    header: "Default",
    cell: (info) =>
      info.getValue() ? h("div", { class: "i-heroicons-check" }) : null,
  }),
  columnHelper.accessor("frontmatter.cloudOnly", {
    header: "Cloud Only",
    cell: (info) =>
      info.getValue() ? h("div", { class: "i-heroicons-check" }) : null,
  }),
];
</script>

<template>
  <BaseTable :data="data" :columns="columns" />
</template>
