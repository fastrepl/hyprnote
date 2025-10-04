import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

import * as persisted from "../tinybase/store/persisted";

import { useRightPanel } from "@hypr/utils/contexts";
import { Chat } from "../components/chat";
import { Sidebar } from "../components/sidebar";

const schema = z.object({
  id: z.string(),
});

export const Route = createFileRoute("/app/_layout/main/")({
  validateSearch: zodValidator(schema),
  loaderDeps: ({ search }) => search,
  loader: ({ deps: { id } }) => ({ id }),
  component: Component,
});

function Component() {
  const { id } = Route.useLoaderData();
  const { isExpanded } = useRightPanel();

  return (
    <div className="flex flex-row gap-2">
      <Sidebar />
      <Note sessionId={id} />
      {isExpanded && <Chat />}
    </div>
  );
}

function Note({ sessionId }: { sessionId: string }) {
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
  );
}
