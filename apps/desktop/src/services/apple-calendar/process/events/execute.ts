import type { EventStorage } from "@hypr/store";

import { id } from "../../../../utils";
import type { Ctx } from "../../ctx";
import type { EventsSyncOutput } from "./types";

export type EventsSyncResult = {
  trackingIdToEventId: Map<string, string>;
};

export function executeForEventsSync(
  ctx: Ctx,
  out: EventsSyncOutput,
): EventsSyncResult {
  const userId = ctx.store.getValue("user_id");
  if (!userId) {
    throw new Error("user_id is not set");
  }

  const now = new Date().toISOString();
  const trackingIdToEventId = new Map<string, string>();

  ctx.store.transaction(() => {
    for (const eventId of out.toDelete) {
      ctx.store.delRow("events", eventId);
    }

    for (const event of out.toUpdate) {
      ctx.store.setPartialRow("events", event.id, {
        tracking_id_event: event.tracking_id_event,
        calendar_id: event.calendar_id,
        title: event.title,
        started_at: event.started_at,
        ended_at: event.ended_at,
        location: event.location,
        meeting_link: event.meeting_link,
        description: event.description,
      });
      trackingIdToEventId.set(event.tracking_id_event!, event.id);
    }

    for (const incomingEvent of out.toAdd) {
      const calendarId = ctx.calendarTrackingIdToId.get(
        incomingEvent.tracking_id_calendar,
      );
      if (!calendarId) {
        continue;
      }

      const eventId = id();
      trackingIdToEventId.set(incomingEvent.tracking_id_event, eventId);

      ctx.store.setRow("events", eventId, {
        user_id: userId,
        created_at: now,
        tracking_id_event: incomingEvent.tracking_id_event,
        calendar_id: calendarId,
        title: incomingEvent.title ?? "",
        started_at: incomingEvent.started_at ?? "",
        ended_at: incomingEvent.ended_at ?? "",
        location: incomingEvent.location,
        meeting_link: incomingEvent.meeting_link,
        description: incomingEvent.description,
      } satisfies EventStorage);
    }
  });

  return { trackingIdToEventId };
}
