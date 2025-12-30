import type { Ctx } from "../ctx";
import type { ExistingEvent } from "./types";

export function fetchExistingEvents(ctx: Ctx): ExistingEvent[] {
  const events: ExistingEvent[] = [];

  ctx.store.forEachRow("events", (rowId, _forEachCell) => {
    const event = ctx.store.getRow("events", rowId);
    if (!event) return;

    const calendarId = event.calendar_id as string | undefined;
    if (!calendarId) {
      return;
    }

    const startedAt = event.started_at as string | undefined;
    if (!startedAt) return;

    const eventDate = new Date(startedAt);
    if (eventDate >= ctx.from && eventDate <= ctx.to) {
      events.push({
        id: rowId,
        tracking_id_event: event.tracking_id_event as string | undefined,
        user_id: event.user_id as string | undefined,
        created_at: event.created_at as string | undefined,
        calendar_id: calendarId,
        title: event.title as string | undefined,
        started_at: startedAt,
        ended_at: event.ended_at as string | undefined,
        location: event.location as string | undefined,
        meeting_link: event.meeting_link as string | undefined,
        description: event.description as string | undefined,
        note: event.note as string | undefined,
      });
    }
  });

  return events;
}
