import type { Ctx } from "../../ctx";
import type { ExistingEvent, IncomingEvent } from "../../fetch/types";
import { getSessionForEvent, isSessionEmpty } from "../utils";
import type { EventsSyncInput, EventsSyncOutput } from "./types";

function getEventKey(
  trackingId: string,
  startedAt: string | undefined,
  hasRecurrenceRules: boolean,
): string {
  if (hasRecurrenceRules && startedAt) {
    return `${trackingId}::${startedAt}`;
  }
  return trackingId;
}

export function syncEvents(
  ctx: Ctx,
  { incoming, existing }: EventsSyncInput,
): EventsSyncOutput {
  const out: EventsSyncOutput = {
    toDelete: [],
    toDeleteSessions: [],
    toUpdate: [],
    toAdd: [],
  };

  const incomingEventMap = new Map(
    incoming.map((e) => [
      getEventKey(e.tracking_id_event, e.started_at, e.has_recurrence_rules),
      e,
    ]),
  );
  const handledEventKeys = new Set<string>();

  for (const storeEvent of existing) {
    const sessionId = getSessionForEvent(ctx.store, storeEvent.id);
    const hasNonEmptySession = sessionId
      ? !isSessionEmpty(ctx.store, sessionId)
      : false;

    if (!ctx.calendarIds.has(storeEvent.calendar_id!)) {
      if (!hasNonEmptySession) {
        out.toDelete.push(storeEvent.id);
        if (sessionId) {
          out.toDeleteSessions.push(sessionId);
        }
      }
      continue;
    }

    const trackingId = storeEvent.tracking_id_event;
    let eventKey: string | undefined;
    let matchingIncomingEvent: IncomingEvent | undefined;
    if (!trackingId) {
      eventKey = undefined;
      matchingIncomingEvent = undefined;
    } else if (storeEvent.has_recurrence_rules === undefined) {
      // if a stored event does not have a has_recurrence_rules field,
      // we check for both non-recurrent events and recurrent events.
      eventKey = getEventKey(trackingId, storeEvent.started_at, false);
      matchingIncomingEvent = incomingEventMap.get(eventKey);
      if (!matchingIncomingEvent) {
        eventKey = getEventKey(trackingId, storeEvent.started_at, true);
        matchingIncomingEvent = incomingEventMap.get(eventKey);
      }
    } else {
      eventKey = getEventKey(
        trackingId,
        storeEvent.started_at,
        storeEvent.has_recurrence_rules,
      );
      matchingIncomingEvent = incomingEventMap.get(eventKey);
    }

    if (matchingIncomingEvent && trackingId && eventKey) {
      out.toUpdate.push({
        ...storeEvent,
        ...matchingIncomingEvent,
        id: storeEvent.id,
        tracking_id_event: trackingId,
        user_id: storeEvent.user_id,
        created_at: storeEvent.created_at,
        calendar_id: storeEvent.calendar_id,
        has_recurrence_rules: matchingIncomingEvent.has_recurrence_rules,
      });
      handledEventKeys.add(eventKey);
      continue;
    }

    if (hasNonEmptySession) {
      continue;
    }

    const rescheduledEvent = findRescheduledEvent(ctx, storeEvent, incoming);
    const rescheduledEventKey = rescheduledEvent
      ? getEventKey(
          rescheduledEvent.tracking_id_event,
          rescheduledEvent.started_at,
          rescheduledEvent.has_recurrence_rules,
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
        has_recurrence_rules: rescheduledEvent.has_recurrence_rules,
      });
      handledEventKeys.add(rescheduledEventKey);
      continue;
    }

    out.toDelete.push(storeEvent.id);
    if (sessionId) {
      out.toDeleteSessions.push(sessionId);
    }
  }

  for (const incomingEvent of incoming) {
    const incomingEventKey = getEventKey(
      incomingEvent.tracking_id_event,
      incomingEvent.started_at,
      incomingEvent.has_recurrence_rules,
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
