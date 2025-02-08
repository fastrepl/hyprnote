import { useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { Session } from "@/types/tauri.gen";
import { DataTable } from "./data-table";
import { columns } from "./columns";
import { Trans } from "@lingui/react/macro";

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
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 text-foreground">
      <h2 className="text-2xl font-semibold">
        <Trans>Past Notes</Trans>
      </h2>
      <DataTable
        data={data}
        columns={columns}
        handleClickRow={handleClickRow}
      />
    </div>
  );
}
