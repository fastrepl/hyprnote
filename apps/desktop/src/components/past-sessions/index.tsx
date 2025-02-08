import type { Session } from "@/types/tauri.gen";
import SessionList from "./session-list";
import { Trans } from "@lingui/react/macro";

interface PastSessionsProps {
  data: Session[];
}

export default function PastSessions({ data }: PastSessionsProps) {
  return (
    <div className="mx-auto w-full max-w-3xl pb-24">
      <h2 className="mb-4 text-2xl font-semibold">
        <Trans>Past Notes</Trans>
      </h2>
      <SessionList data={data} />
    </div>
  );
}
