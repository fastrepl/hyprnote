import { Link } from "@tanstack/react-router";
import { useCell, useSortedRowIds } from "tinybase/ui-react";

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
      <ul>
        <li>
          {sessionIds?.map((sessionId) => <SessionItem key={sessionId} sessionId={sessionId} />)}
        </li>
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

  return (
    <Link to="/app/note/$id" params={{ id: sessionId }}>
      <div className="p-4 border border-gray-200">
        <strong>{title}</strong>
      </div>
    </Link>
  );
}
