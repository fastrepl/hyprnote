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
    [sessionId],
    hybrid.STORE_ID,
  );

  return (
    <div>
      <input type="text" value={row.title} onChange={(e) => handleEditTitle(e.target.value)} />
      <pre>{JSON.stringify(row, null, 2)}</pre>
    </div>
  );
}
