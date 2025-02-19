<script setup lang="ts">
import { h, withDirectives } from "vue";
import { vTooltip as tooltip } from "floating-vue";
import { createColumnHelper } from "@tanstack/vue-table";

import type { PluginFrontmatter } from "../types";
import BaseTable from "./BaseTable.vue";

type Row = {
  url: string;
  frontmatter: PluginFrontmatter;
};

const props = defineProps<{ data: Row[] }>();
const columnHelper = createColumnHelper<Row>();

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
