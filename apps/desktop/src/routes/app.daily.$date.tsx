import { createFileRoute, redirect } from "@tanstack/react-router";

import { commands as dbCommands } from "@hypr/plugin-db";
export const Route = createFileRoute("/app/daily/$date")({
  beforeLoad: async ({ context: { queryClient, userId }, params: { date } }) => {
    const existingSession = await queryClient.fetchQuery({
      queryKey: ["daily", date],
      // TODO
      queryFn: () => dbCommands.getSession({ id: date }),
    });

    if (existingSession) {
      redirect({ to: "/app/note/$id", params: { id: existingSession.id } });
    }

    const newSession = await dbCommands.upsertSession({
      id: date,
      created_at: new Date().toISOString(),
      visited_at: new Date().toISOString(),
      user_id: userId,
      calendar_event_id: null,
      title: date,
      raw_memo_html: "",
      enhanced_memo_html: null,
      conversations: [],
      is_meeting: false,
    });

    redirect({ to: "/app/note/$id", params: { id: newSession.id } });
  },
});
