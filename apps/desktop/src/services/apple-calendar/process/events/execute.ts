import type { EventStorage } from "@hypr/store";

import { deterministicEventId } from "../../../../utils";
import type { Ctx } from "../../ctx";
import { getSessionForEvent } from "../utils";
import type { EventsSyncOutput } from "./types";

export type EventsSyncResult = {
  trackingIdToEventId: Map<string, string>;
};

export function cleanupDuplicateEvents(ctx: Ctx): number {
  const eventsByKey = new Map<
    string,
    Array<{ id: string; createdAt: string; hasSession: boolean }>
  >();

  ctx.store.forEachRow("events", (rowId, _forEachCell) => {
    const event = ctx.store.getRow("events", rowId);
    if (!event) return;

    const trackingId = event.tracking_id_event as string | undefined;
    const startedAt = event.started_at as string | undefined;
    if (!trackingId || !startedAt) return;

    const sessionId = getSessionForEvent(ctx.store, rowId);

    const key = `${trackingId}::${startedAt}`;
    const existing = eventsByKey.get(key) ?? [];
    existing.push({
      id: rowId,
      createdAt: (event.created_at as string) ?? "",
      hasSession: !!sessionId,
    });
    eventsByKey.set(key, existing);
  });

  let deletedCount = 0;
  ctx.store.transaction(() => {
    for (const [, events] of eventsByKey) {
      if (events.length <= 1) continue;

      const eventWithSession = events.find((e) => e.hasSession);
      const eventToKeep =
        eventWithSession ??
        events.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

      for (const event of events) {
        if (event.id === eventToKeep.id) continue;

        if (event.hasSession) {
          const sessionId = getSessionForEvent(ctx.store, event.id);
          if (sessionId) {
            ctx.store.setPartialRow("sessions", sessionId, {
              event_id: eventToKeep.id,
            });
          }
        }

        ctx.store.delRow("events", event.id);
        deletedCount++;
      }
    }
  });

  return deletedCount;
}

function getIgnoredRecurringSeries(ctx: Ctx): Set<string> {
  const raw = ctx.store.getValue("ignored_recurring_series");
  if (!raw) {
    return new Set();
  }
  try {
    const parsed = JSON.parse(String(raw));
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

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
  const ignoredSeries = getIgnoredRecurringSeries(ctx);

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
        ignored: event.ignored as boolean | undefined,
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

      const eventId = deterministicEventId(
        incomingEvent.tracking_id_event,
        incomingEvent.started_at ?? "",
      );
      trackingIdToEventId.set(incomingEvent.tracking_id_event, eventId);

      const shouldIgnore =
        incomingEvent.recurrence_series_id &&
        ignoredSeries.has(incomingEvent.recurrence_series_id);

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
        ignored: shouldIgnore || undefined,
      } satisfies EventStorage);
    }
  });

  return { trackingIdToEventId };
}
