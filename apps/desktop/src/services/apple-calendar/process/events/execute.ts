import type { EventStorage, SessionEvent } from "@hypr/store";
import { formatDate } from "@hypr/utils";

import { id } from "../../../../utils";
import {
  buildSessionEventJson,
  getSessionEventById,
} from "../../../../utils/session-event";
import type { Ctx } from "../../ctx";
import type { IncomingEvent } from "../../fetch/types";
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
        recurrence_series_id: event.recurrence_series_id,
        has_recurrence_rules: event.has_recurrence_rules,
        is_all_day: event.is_all_day,
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
        recurrence_series_id: incomingEvent.recurrence_series_id,
        has_recurrence_rules: incomingEvent.has_recurrence_rules,
        is_all_day: incomingEvent.is_all_day,
      } satisfies EventStorage);
    }
  });

  return { trackingIdToEventId };
}

// TODO: eww!

function getKey(event: IncomingEvent): string {
  const startedAt = event.started_at ? new Date(event.started_at) : null;
  if (event.has_recurrence_rules) {
    const day = startedAt ? formatDate(startedAt, "yyyy-MM-dd") : "1970-01-01";
    return `${event.tracking_id_event}:${day}`;
  }
  return event.tracking_id_event;
}

function getSessionEventKey(event: SessionEvent): string {
  const startedAt = event.started_at ? new Date(event.started_at) : null;
  if (event.has_recurrence_rules) {
    const day = startedAt ? formatDate(startedAt, "yyyy-MM-dd") : "1970-01-01";
    return `${event.tracking_id}:${day}`;
  }
  return event.tracking_id;
}

export function syncSessionEmbeddedEvents(
  ctx: Ctx,
  incoming: IncomingEvent[],
): void {
  const incomingByKey = new Map<string, IncomingEvent>();
  for (const event of incoming) {
    incomingByKey.set(getKey(event), event);
  }

  ctx.store.transaction(() => {
    ctx.store.forEachRow("sessions", (sessionId, _forEachCell) => {
      const sessionEvent = getSessionEventById(ctx.store, sessionId);
      if (!sessionEvent) return;
      const key = getSessionEventKey(sessionEvent);

      const incomingEvent = incomingByKey.get(key);
      if (!incomingEvent) return;

      const calendarId =
        ctx.calendarTrackingIdToId.get(incomingEvent.tracking_id_calendar) ??
        "";

      const updated: SessionEvent = {
        tracking_id: incomingEvent.tracking_id_event,
        calendar_id: calendarId,
        title: incomingEvent.title ?? "",
        started_at: incomingEvent.started_at ?? "",
        ended_at: incomingEvent.ended_at ?? "",
        is_all_day: incomingEvent.is_all_day,
        has_recurrence_rules: incomingEvent.has_recurrence_rules,
        location: incomingEvent.location,
        meeting_link: incomingEvent.meeting_link,
        description: incomingEvent.description,
        recurrence_series_id: incomingEvent.recurrence_series_id,
      };

      ctx.store.setPartialRow("sessions", sessionId, {
        eventJson: buildSessionEventJson(updated),
      });
    });
  });
}
