import { createFileRoute } from "@tanstack/react-router";
import * as hybrid from "../tinybase/store/hybrid";

export const Route = createFileRoute("/app/note/$id")({
  component: Component,
});

function Component() {
  const { id: sessionId } = Route.useParams();
  const row = hybrid.UI.useRow("sessions", sessionId, hybrid.STORE_ID);

  const handleEditTitle = hybrid.UI.useSetRowCallback(
    "sessions",
    sessionId,
    (input: string, _store) => ({ ...row, title: input }),
    [row],
    hybrid.STORE_ID,
  );

  const handleEditRawMd = hybrid.UI.useSetRowCallback(
    "sessions",
    sessionId,
    (input: string, _store) => ({ ...row, raw_md: input }),
    [row],
    hybrid.STORE_ID,
  );

  return (
    <div className="flex flex-col gap-4 px-32 py-16">
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
  );
}
