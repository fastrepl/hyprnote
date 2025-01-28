import { useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";

import type { Session } from "@/types/tauri.gen";
import { DataTable } from "./data-table";
import { columns } from "./columns";

export default function PastSessions({ data }: { data: Session[] }) {
  const navigate = useNavigate();

  const handleClickRow = useCallback(
    (session: Session) => {
      navigate({
        to: "/note/$id",
        params: {
          id: session.id,
        },
      });
    },
    [navigate],
  );

  return (
    <DataTable data={data} columns={columns} handleClickRow={handleClickRow} />
  );
}
