import { createFileRoute } from "@tanstack/react-router";
import * as persisted from "../tinybase/store/persisted";

import { Chat } from "../components/chat";

export const Route = createFileRoute("/app/note/$id")({
  component: Component,
});

function Component() {
  const { id: sessionId } = Route.useParams();
  const row = persisted.UI.useRow("sessions", sessionId, persisted.STORE_ID);

  const handleEditTitle = persisted.UI.useSetRowCallback(
    "sessions",
    sessionId,
    (input: string, _store) => ({ ...row, title: input }),
    [row],
    persisted.STORE_ID,
  );

  const handleEditRawMd = persisted.UI.useSetRowCallback(
    "sessions",
    sessionId,
    (input: string, _store) => ({ ...row, raw_md: input }),
    [row],
    persisted.STORE_ID,
  );

  return (
    <div className="flex flex-row gap-4 px-12 py-8">
      <div className="flex flex-col gap-2">
        <input
          className="border border-gray-300 rounded p-2"
          type="text"
          value={row.title}
          onChange={(e) => handleEditTitle(e.target.value)}
        />
        <textarea
          className="border border-gray-300 rounded p-2"
          value={row.raw_md}
          onChange={(e) => handleEditRawMd(e.target.value)}
        />
      </div>
      <Chat />
    </div>
  );
}
