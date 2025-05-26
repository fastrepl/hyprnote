import { createFileRoute, redirect } from "@tanstack/react-router";

import { commands as dbCommands } from "@hypr/plugin-db";

export const Route = createFileRoute("/app/note/event/$id")({
  beforeLoad: async ({ params: { id }, context: { userId } }) => {
    const event = await dbCommands.getEvent(id);

    if (event?.user_id !== userId) {
      return redirect({ to: "/app/new" });
    }

    const session = await dbCommands.getSession({ calendarEventId: event.id });

    if (!session) {
      return redirect({ to: "/app/new", search: { calendarEventId: event.id } });
    } else {
      return redirect({ to: "/app/note/$id", params: { id: session.id } });
    }
  },
});
