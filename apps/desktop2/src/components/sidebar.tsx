import { useCell, useRemoteRowId, useResultCell, useResultSortedRowIds } from "tinybase/ui-react";

export function Sidebar() {
  const sessionIds = useResultSortedRowIds(
    "recentSessions",
    "createdAt",
    true,
    0,
    10,
    "main",
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
  const title = useResultCell(
    "recentSessions",
    sessionId,
    "title",
    "main",
  );

  const userRowId = useRemoteRowId(
    "sessionUser",
    sessionId,
    "main",
  );

  const userName = useCell("users", userRowId as string, "name", "main");

  return (
    <li>
      <div>
        <strong>{title}</strong>
        <span>by {userName || "Unknown"}</span>
      </div>
    </li>
  );
}
