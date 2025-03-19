import { createFileRoute, redirect } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

import { commands as authCommands } from "@hypr/plugin-auth";
import { commands as dbCommands, type Session } from "@hypr/plugin-db";

const schema = z.object({
  calendarEventId: z.string().optional(),
});

export const Route = createFileRoute("/app/new")({
  validateSearch: zodValidator(schema),
  beforeLoad: async ({
    context: { queryClient, sessionsStore },
    search,
  }) => {
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
        calendar_event_id: search.calendarEventId ?? null,
        title: "",
        audio_local_path: null,
        audio_remote_path: null,
        raw_memo_html: "",
        enhanced_memo_html: null,
        conversations: [],
      };

      const session = await dbCommands.upsertSession(emptySession);

      const { insert } = sessionsStore.getState();
      insert(session);

      await queryClient.invalidateQueries({
        queryKey: ["sessions"],
      });

      return redirect({
        to: "/app/note/$id",
        params: { id: session.id },
      });
    } catch (error) {
      console.error(error);
      return redirect({ to: "/app" });
    }
  },
});
