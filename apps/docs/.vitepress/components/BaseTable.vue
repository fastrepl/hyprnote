<script setup lang="ts">
import {
  FlexRender,
  getCoreRowModel,
  useVueTable,
  type ColumnDef,
} from "@tanstack/vue-table";

const props = defineProps<{
  data: Array<any>;
  columns: ColumnDef<any, any>[];
}>();

const table = useVueTable({
  data: props.data || [],
  columns: props.columns,
  getCoreRowModel: getCoreRowModel(),
});
</script>

<template>
  <div class="p-2">
    <table>
      <thead>
        <tr
          v-for="headerGroup in table.getHeaderGroups()"
          :key="headerGroup.id"
        >
          <th v-for="header in headerGroup.headers" :key="header.id">
            <FlexRender
              v-if="!header.isPlaceholder"
              :render="header.column.columnDef.header"
              :props="header.getContext()"
            />
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in table.getRowModel().rows" :key="row.id">
          <td v-for="cell in row.getVisibleCells()" :key="cell.id">
            <FlexRender
              :render="cell.column.columnDef.cell"
              :props="cell.getContext()"
            />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
