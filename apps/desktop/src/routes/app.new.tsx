import { createFileRoute, redirect } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

import { commands as dbCommands } from "@hypr/plugin-db";

const schema = z.object({
  calendarEventId: z.string().optional(),
});

export const Route = createFileRoute("/app/new")({
  validateSearch: zodValidator(schema),
  beforeLoad: async ({
    context: { queryClient, sessionsStore, userId },
    search: { calendarEventId },
  }) => {
    try {
      const sessionId = crypto.randomUUID();

      if (calendarEventId) {
        const event = await queryClient.fetchQuery({
          queryKey: ["event", calendarEventId],
          queryFn: () => dbCommands.getEvent(calendarEventId!),
        });

        const session = await dbCommands.upsertSession({
          id: sessionId,
          user_id: userId,
          created_at: new Date().toISOString(),
          visited_at: new Date().toISOString(),
          calendar_event_id: event?.id ?? null,
          title: event?.name ?? "",
          raw_memo_html: "",
          enhanced_memo_html: null,
          conversations: [],
        });
        await dbCommands.sessionAddParticipant(sessionId, userId);

        const { insert } = sessionsStore.getState();
        insert(session);

        await queryClient.invalidateQueries({
          queryKey: ["event-session", calendarEventId],
        });
      } else {
        const session = await dbCommands.upsertSession({
          id: sessionId,
          user_id: userId,
          created_at: new Date().toISOString(),
          visited_at: new Date().toISOString(),
          calendar_event_id: null,
          title: "",
          raw_memo_html: "",
          enhanced_memo_html: null,
          conversations: [],
        });
        await dbCommands.sessionAddParticipant(sessionId, userId);

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
