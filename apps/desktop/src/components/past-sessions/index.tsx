import type { Session } from "@/types/tauri.gen";
import SessionList from "./session-list";
import { Trans } from "@lingui/react/macro";

interface PastSessionsProps {
  data: Session[];
}

export default function PastSessions({ data }: PastSessionsProps) {
  return (
    <div className="pb-24">
      <h2 className="mb-4 text-lg font-semibold">
        <Trans>Past Notes</Trans>
      </h2>

      <SessionList data={data} />
    </div>
  );
}
