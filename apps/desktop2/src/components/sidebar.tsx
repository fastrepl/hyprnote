import { useCell, useRemoteRowId, useResultCell, useResultSortedRowIds } from "tinybase/ui-react";

export function Sidebar() {
  const sessionIds = useResultSortedRowIds(
    "recentSessions",
    "createdAt",
    true,
    0,
    10,
    "recentSessions",
  );

  return (
    <div className="sidebar">
      <h2>Recent Sessions</h2>
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
    "recentSessions",
  );

  // Use relationship to get the remote user row ID
  const userRowId = useRemoteRowId(
    "sessionUser",
    sessionId,
    "sessionUser",
  );

  // Get the user's name from the users table
  const userName = useCell("users", userRowId as string, "name", "users");

  return (
    <li>
      <div>
        <strong>{title}</strong>
        <span>by {userName || "Unknown"}</span>
      </div>
    </li>
  );
}
