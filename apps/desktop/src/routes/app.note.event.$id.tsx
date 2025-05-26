import { createFileRoute, redirect } from "@tanstack/react-router";

import { commands as dbCommands } from "@hypr/plugin-db";

export const Route = createFileRoute("/app/note/event/$id")({
  beforeLoad: async ({ params: { id } }) => {
    const session = await dbCommands.getSession({ calendarEventId: id });

    if (!session) {
      throw redirect({ to: "/app/new", search: { calendarEventId: id } });
    }

    throw redirect({ to: "/app/note/$id", params: { id: session.id } });
  },
});
