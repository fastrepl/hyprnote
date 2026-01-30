import type { Ctx } from "../../ctx";
import type { ExistingEvent, IncomingEvent } from "../../fetch/types";
import { getSessionForEvent, isSessionEmpty } from "../utils";
import type { EventsSyncInput, EventsSyncOutput } from "./types";

function getEventKey(trackingId: string, startedAt?: string): string {
  return startedAt ? `${trackingId}::${startedAt}` : trackingId;
}

export function syncEvents(
  ctx: Ctx,
  { incoming, existing }: EventsSyncInput,
): EventsSyncOutput {
  const out: EventsSyncOutput = {
    toDelete: [],
    toUpdate: [],
    toAdd: [],
  };

  const incomingEventMap = new Map(
    incoming.map((e) => [getEventKey(e.tracking_id_event, e.started_at), e]),
  );
  const handledEventKeys = new Set<string>();

  const uniqueTrackingIdMap = new Map<string, IncomingEvent>();
  {
    const trackingIdCounts = new Map<string, number>();
    for (const e of incoming) {
      trackingIdCounts.set(
        e.tracking_id_event,
        (trackingIdCounts.get(e.tracking_id_event) ?? 0) + 1,
      );
    }
    for (const e of incoming) {
      if (trackingIdCounts.get(e.tracking_id_event) === 1) {
        uniqueTrackingIdMap.set(e.tracking_id_event, e);
      }
    }
  }

  for (const storeEvent of existing) {
    const sessionId = getSessionForEvent(ctx.store, storeEvent.id);
    const hasNonEmptySession =
      sessionId && !isSessionEmpty(ctx.store, sessionId);

    if (!ctx.calendarIds.has(storeEvent.calendar_id!)) {
      if (!hasNonEmptySession) {
        out.toDelete.push(storeEvent.id);
      }
      continue;
    }

    const trackingId = storeEvent.tracking_id_event;
    const eventKey = trackingId
      ? getEventKey(trackingId, storeEvent.started_at ?? undefined)
      : undefined;
    const matchingIncomingEvent = eventKey
      ? incomingEventMap.get(eventKey)
      : undefined;

    if (matchingIncomingEvent && trackingId && eventKey) {
      out.toUpdate.push({
        ...storeEvent,
        ...matchingIncomingEvent,
        id: storeEvent.id,
        tracking_id_event: trackingId,
        user_id: storeEvent.user_id,
        created_at: storeEvent.created_at,
        calendar_id: storeEvent.calendar_id,
      });
      handledEventKeys.add(eventKey);
      continue;
    }

    if (trackingId) {
      const trackingIdMatch = uniqueTrackingIdMap.get(trackingId);
      if (trackingIdMatch) {
        const matchKey = getEventKey(
          trackingIdMatch.tracking_id_event,
          trackingIdMatch.started_at,
        );
        if (!handledEventKeys.has(matchKey)) {
          out.toUpdate.push({
            ...storeEvent,
            ...trackingIdMatch,
            id: storeEvent.id,
            tracking_id_event: trackingId,
            user_id: storeEvent.user_id,
            created_at: storeEvent.created_at,
            calendar_id: storeEvent.calendar_id,
          });
          handledEventKeys.add(matchKey);
          continue;
        }
      }
    }

    const rescheduledEvent = findRescheduledEvent(ctx, storeEvent, incoming);
    const rescheduledEventKey = rescheduledEvent
      ? getEventKey(
          rescheduledEvent.tracking_id_event,
          rescheduledEvent.started_at,
        )
      : undefined;

    if (
      rescheduledEvent &&
      rescheduledEventKey &&
      !handledEventKeys.has(rescheduledEventKey)
    ) {
      out.toUpdate.push({
        ...storeEvent,
        ...rescheduledEvent,
        id: storeEvent.id,
        tracking_id_event: rescheduledEvent.tracking_id_event,
        user_id: storeEvent.user_id,
        created_at: storeEvent.created_at,
        calendar_id: storeEvent.calendar_id,
      });
      handledEventKeys.add(rescheduledEventKey);
      continue;
    }

    if (hasNonEmptySession) {
      continue;
    }

    out.toDelete.push(storeEvent.id);
  }

  for (const incomingEvent of incoming) {
    const incomingEventKey = getEventKey(
      incomingEvent.tracking_id_event,
      incomingEvent.started_at,
    );
    if (!handledEventKeys.has(incomingEventKey)) {
      out.toAdd.push(incomingEvent);
    }
  }

  return out;
}

function findRescheduledEvent(
  ctx: Ctx,
  storeEvent: ExistingEvent,
  incomingEvents: IncomingEvent[],
): IncomingEvent | undefined {
  if (!storeEvent.started_at) {
    return undefined;
  }

  const storeStartDate = new Date(storeEvent.started_at);

  return incomingEvents.find((incoming) => {
    if (!incoming.started_at) {
      return false;
    }

    if (incoming.title !== storeEvent.title) {
      return false;
    }

    const incomingCalendarId = ctx.calendarTrackingIdToId.get(
      incoming.tracking_id_calendar,
    );
    if (incomingCalendarId !== storeEvent.calendar_id) {
      return false;
    }

    const incomingStartDate = new Date(incoming.started_at);
    const daysDiff = Math.abs(
      (incomingStartDate.getTime() - storeStartDate.getTime()) /
        (1000 * 60 * 60 * 24),
    );
    if (daysDiff > 30) {
      return false;
    }

    if (incoming.tracking_id_event === storeEvent.tracking_id_event) {
      return false;
    }

    return true;
  });
}
