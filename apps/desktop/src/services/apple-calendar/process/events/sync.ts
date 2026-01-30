import type { Ctx } from "../../ctx";
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
  const incomingByTrackingId = new Map(
    incoming.map((e) => [e.tracking_id_event, e]),
  );
  const handledEventKeys = new Set<string>();

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

    let matchingIncomingEvent = eventKey
      ? incomingEventMap.get(eventKey)
      : undefined;

    if (!matchingIncomingEvent && trackingId) {
      matchingIncomingEvent = incomingByTrackingId.get(trackingId);
    }

    if (matchingIncomingEvent && trackingId) {
      const newEventKey = getEventKey(
        matchingIncomingEvent.tracking_id_event,
        matchingIncomingEvent.started_at,
      );
      out.toUpdate.push({
        ...storeEvent,
        ...matchingIncomingEvent,
        id: storeEvent.id,
        tracking_id_event: trackingId,
        user_id: storeEvent.user_id,
        created_at: storeEvent.created_at,
        calendar_id: storeEvent.calendar_id,
      });
      handledEventKeys.add(newEventKey);
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
