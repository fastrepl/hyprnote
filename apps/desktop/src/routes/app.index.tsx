import { createFileRoute, redirect } from "@tanstack/react-router";

import { commands as authCommands } from "@hypr/plugin-auth";
import { commands as dbCommands, type Session } from "@hypr/plugin-db";

export const Route = createFileRoute("/app/")({
  beforeLoad: async ({ context: { queryClient } }) => {
    const id = await authCommands.getFromStore("auth-user-id");

    if (!id) {
      throw redirect({ to: "/login" });
    }

    try {
      const emptySession: Session = {
        id: crypto.randomUUID(),
        user_id: id,
        created_at: new Date().toISOString(),
        visited_at: new Date().toISOString(),
        calendar_event_id: null,
        title: "",
        audio_local_path: null,
        audio_remote_path: null,
        raw_memo_html: "",
        enhanced_memo_html: null,
        conversations: [],
      };

      const session = await dbCommands.upsertSession(emptySession);
      queryClient.invalidateQueries({ queryKey: ["sessions"] });

      return redirect({
        to: "/app/note/$id/main",
        params: { id: session.id },
      });
    } catch (error) {
      console.error(error);
      return redirect({ to: "/app" });
    }
  },
});
