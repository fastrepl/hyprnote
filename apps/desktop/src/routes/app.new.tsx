import { createFileRoute, redirect } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

import { commands as dbCommands, type Session } from "@hypr/plugin-db";

const schema = z.object({
  meeting: z.boolean().default(true),
  record: z.boolean().optional(),
  calendarEventId: z.string().optional(),
});

export const Route = createFileRoute("/app/new")({
  validateSearch: zodValidator(schema),
  beforeLoad: async ({
    context: { queryClient, ongoingSessionStore, sessionsStore, userId },
    search: { meeting, record, calendarEventId },
  }) => {
    try {
      const sessionId = crypto.randomUUID();

      const base: Session = {
        id: sessionId,
        user_id: userId,
        created_at: new Date().toISOString(),
        visited_at: new Date().toISOString(),
        calendar_event_id: null,
        title: "",
        raw_memo_html: "",
        enhanced_memo_html: null,
        conversations: [],
        is_meeting: meeting,
      };

      const constructSession = async () => {
        if (!meeting) {
          return {
            ...base,
            title: new Date().toLocaleDateString("en-CA").replace(/-/g, ""),
            is_meeting: false,
          };
        }

        if (calendarEventId) {
          const event = await queryClient.fetchQuery({
            queryKey: ["event", calendarEventId],
            queryFn: () => dbCommands.getEvent(calendarEventId!),
          });

          return {
            ...base,
            calendar_event_id: calendarEventId,
            title: event?.name ?? "",
          };
        }

        return base;
      };

      const session = await constructSession();
      await dbCommands.upsertSession(session);
      await dbCommands.sessionAddParticipant(session.id, userId);

      const { insert } = sessionsStore.getState();
      insert(session);

      if (record) {
        const { start } = ongoingSessionStore.getState();
        start(sessionId);
      }

      await queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "events",
      });

      await queryClient.invalidateQueries({
        predicate: (query) => query.queryKey.some((key) => (typeof key === "string") && key.includes("session")),
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
