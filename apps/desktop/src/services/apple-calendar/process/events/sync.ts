import type { Ctx } from "../../ctx";
import type { ExistingEvent, IncomingEvent } from "../../fetch/types";
import { isLegacyEventId } from "../../utils/event-id";
import { getSessionForEvent, isSessionEmpty } from "../utils";
import type { EventsSyncInput, EventsSyncOutput } from "./types";

export function syncEvents(
  ctx: Ctx,
  { incoming, existing }: EventsSyncInput,
): EventsSyncOutput {
  const out: EventsSyncOutput = {
    toDelete: [],
    toUpdate: [],
    toAdd: [],
  };

  const incomingEventMap = new Map(incoming.map((e) => [e.id, e]));
  const existingEventMap = new Map(existing.map((e) => [e.id, e]));
  const handledEventIds = new Set<string>();

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

    const matchingIncomingEvent = incomingEventMap.get(storeEvent.id);

    if (matchingIncomingEvent) {
      out.toUpdate.push({
        ...storeEvent,
        ...matchingIncomingEvent,
        id: storeEvent.id,
        tracking_id_event: matchingIncomingEvent.tracking_id_event,
        user_id: storeEvent.user_id,
        created_at: storeEvent.created_at,
        calendar_id: storeEvent.calendar_id,
      });
      handledEventIds.add(storeEvent.id);
      continue;
    }

    if (hasNonEmptySession) {
      continue;
    }

    if (isLegacyEventId(storeEvent.id)) {
      const rescheduledEvent = findRescheduledEvent(ctx, storeEvent, incoming);
      if (rescheduledEvent && !handledEventIds.has(rescheduledEvent.id)) {
        out.toUpdate.push({
          ...storeEvent,
          ...rescheduledEvent,
          id: storeEvent.id,
          tracking_id_event: rescheduledEvent.tracking_id_event,
          user_id: storeEvent.user_id,
          created_at: storeEvent.created_at,
          calendar_id: storeEvent.calendar_id,
        });
        handledEventIds.add(rescheduledEvent.id);
        continue;
      }
    }

    out.toDelete.push(storeEvent.id);
  }

  for (const incomingEvent of incoming) {
    if (!handledEventIds.has(incomingEvent.id)) {
      if (!existingEventMap.has(incomingEvent.id)) {
        out.toAdd.push(incomingEvent);
      }
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
