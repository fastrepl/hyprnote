import { useCell, useRemoteRowId, useSortedRowIds } from "tinybase/ui-react";
import * as hybrid from "../tinybase/store/hybrid";

export function Sidebar() {
  const sessionIds = useSortedRowIds(
    "sessions",
    "createdAt",
    true,
    0,
    10,
    hybrid.STORE_ID,
  );

  return (
    <div className="sidebar">
      <h2>Recent Sessions</h2>
      <p>{JSON.stringify(sessionIds)}</p>
      <ul>
        {sessionIds?.map((sessionId) => <SessionItem key={sessionId} sessionId={sessionId} />)}
      </ul>
    </div>
  );
}

function SessionItem({ sessionId }: { sessionId: string }) {
  const title = useCell(
    "sessions",
    sessionId,
    "title",
    hybrid.STORE_ID,
  );

  const userRowId = useRemoteRowId(
    "sessionUser",
    sessionId,
    hybrid.STORE_ID,
  );

  const userName = useCell("users", userRowId as string, "name", hybrid.STORE_ID);

  return (
    <li>
      <div>
        <strong>{title}</strong>
        <span>by {userName || "Unknown"}</span>
      </div>
    </li>
  );
}
