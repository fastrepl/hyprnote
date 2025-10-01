import { createQueries } from "tinybase";
import { useCell, useRemoteRowId, useResultCell, useResultSortedRowIds } from "tinybase/ui-react";

import { TABLE_NAMES } from "@hypr/db";
import { mainRelationships, mainStore } from "../tinybase";

const mainQueries = createQueries(mainStore).setQueryDefinition(
  "recentSessions",
  TABLE_NAMES.sessions,
  ({ select }) => {
    select("title");
    select("userId");
    select("createdAt");
  },
);

export function Sidebar() {
  const sessionIds = useResultSortedRowIds(
    "recentSessions",
    "createdAt",
    true,
    0,
    10,
    mainQueries,
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
    mainQueries,
  );

  // Use relationship to get the remote user row ID
  const userRowId = useRemoteRowId(
    "sessionUser",
    sessionId,
    mainRelationships,
  );

  // Get the user's name from the users table
  const userName = useCell("users", userRowId as string, "name", mainStore);

  return (
    <li>
      <div>
        <strong>{title}</strong>
        <span>by {userName || "Unknown"}</span>
      </div>
    </li>
  );
}
