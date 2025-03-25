import { createFileRoute, redirect } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

import { commands as authCommands } from "@hypr/plugin-auth";
import { commands as dbCommands } from "@hypr/plugin-db";

const schema = z.object({
  calendarEventId: z.string().optional(),
});

export const Route = createFileRoute("/app/new")({
  validateSearch: zodValidator(schema),
  beforeLoad: async ({
    context: { queryClient, sessionsStore },
    search: { calendarEventId },
  }) => {
    const id = await authCommands.getFromStore("auth-user-id");

    if (!id) {
      throw redirect({ to: "/login" });
    }

    try {
      const sessionId = crypto.randomUUID();

      if (calendarEventId) {
        const event = await queryClient.fetchQuery({
          queryKey: ["event", calendarEventId],
          queryFn: () => dbCommands.getEvent(calendarEventId!),
        });

        const session = await dbCommands.upsertSession({
          id: sessionId,
          user_id: id,
          created_at: new Date().toISOString(),
          visited_at: new Date().toISOString(),
          calendar_event_id: event?.id ?? null,
          title: event?.name ?? "",
          audio_local_path: null,
          audio_remote_path: null,
          raw_memo_html: "",
          enhanced_memo_html: null,
          conversations: [],
        });

        const { insert } = sessionsStore.getState();
        insert(session);

        await queryClient.invalidateQueries({
          queryKey: ["event-session", calendarEventId],
        });
      } else {
        const session = await dbCommands.upsertSession({
          id: sessionId,
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
        });

        const { insert } = sessionsStore.getState();
        insert(session);
      }

      await queryClient.invalidateQueries({
        queryKey: ["sessions"],
      });

      return redirect({
        to: "/app/note/$id",
        params: { id: sessionId },
      });
    } catch (error) {
      console.error(error);
      return redirect({ to: "/app" });
    }
  },
});
