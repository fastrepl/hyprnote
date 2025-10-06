import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

import { commands as dbCommands } from "@hypr/plugin-db";

const validateSearch = z.object({
  record: z.boolean().optional(),
  calendarEventId: z.string().optional(),
});

export const Route = createFileRoute("/app/new")({
  validateSearch,
  beforeLoad: async ({
    context: { queryClient, ongoingSessionStore, sessionsStore, userId },
    search: { record, calendarEventId },
  }): Promise<void> => {
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
        words: [],
        record_start: null,
        record_end: null,
        pre_meeting_memo_html: null,
      });

      // Add current user as participant
      await dbCommands.sessionAddParticipant(sessionId, userId);

      const { insert } = sessionsStore.getState();
      insert(session);
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
        words: [],
        record_start: null,
        record_end: null,
        pre_meeting_memo_html: null,
      });
      await dbCommands.sessionAddParticipant(sessionId, userId);

      const { insert } = sessionsStore.getState();
      insert(session);
    }

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

    throw redirect({
      to: "/app/note/$id",
      params: { id: sessionId },
    });
  },
});
