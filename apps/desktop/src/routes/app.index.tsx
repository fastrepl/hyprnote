import { createFileRoute, redirect } from "@tanstack/react-router";
import { commands as dbCommands, type Session } from "@hypr/plugin-db";
import { commands as authCommands } from "@hypr/plugin-auth";

export const Route = createFileRoute("/app/")({
  beforeLoad: async () => {
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
        title: "Untitled",
        audio_local_path: null,
        audio_remote_path: null,
        raw_memo_html: "",
        enhanced_memo_html: null,
        conversations: [],
      };

      const session = await dbCommands.upsertSession(emptySession);

      return redirect({
        to: "/app/note/$id",
        params: { id: session.id },
      });
    } catch (error) {
      console.error(error);
      return redirect({ to: "/app/home" });
    }
  },
});
