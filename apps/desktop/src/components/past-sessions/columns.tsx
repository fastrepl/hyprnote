import { ColumnDef } from "@tanstack/react-table";

import type { Session } from "@/types/tauri";

export const columns: ColumnDef<Session>[] = [
  {
    accessorKey: "title",
    header: "Title",
  },
  {
    accessorKey: "timestamp",
    header: "Date",
    cell: ({ row }) => {
      const timestamp = parseFloat(row.getValue("timestamp"));
      const date = new Date(timestamp);
      return <span>{date.toLocaleString()}</span>;
    },
  },
];
