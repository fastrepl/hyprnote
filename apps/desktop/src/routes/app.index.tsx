import { createFileRoute, redirect } from "@tanstack/react-router";
import { commands as dbCommands, type Session } from "@hypr/plugin-db";
import { commands as authCommands } from "@hypr/plugin-auth";

export const Route = createFileRoute("/app/")({
  loader: async ({ context: { queryClient } }) => {
    if (!import.meta.env.PROD) {
      return;
    }

    const id = await authCommands.getFromStore("auth-user-id");

    if (!id) {
      throw redirect({ to: "/login" });
    }

    // Always create a new note
    const emptySession: Session = {
      id: crypto.randomUUID(),
      user_id: id,
      timestamp: new Date().toISOString(),
      calendar_event_id: null,
      title: "Untitled",
      audio_local_path: null,
      audio_remote_path: null,
      raw_memo_html: "",
      enhanced_memo_html: null,
      conversations: [],
    };

    try {
      const session = await dbCommands.upsertSession(emptySession);
      throw redirect({
        to: "/app/note/$id",
        params: { id: session.id },
      });
    } catch (error) {
      console.error(error);
      throw redirect({ to: "/login" });
    }
  },
});
