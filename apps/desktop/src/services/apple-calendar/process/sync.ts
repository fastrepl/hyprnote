import type { Store } from "../../../store/tinybase/main";
import type { ExistingEvent, IncomingEvent } from "../fetch/types";
import type { SyncInput, SyncOutput } from "./types";
import { getSessionForEvent, isSessionEmpty } from "./utils";

export function sync(
  store: Store,
  { incoming, existing }: SyncInput,
): SyncOutput {
  const out: SyncOutput = {
    toDelete: [],
    toUpdate: [],
    toAdd: [],
  };

  const incomingEventMap = new Map(incoming.map((e) => [e.id, e]));
  const handledIncomingEventIds = new Set<string>();

  for (const storeEvent of existing) {
    const matchingIncomingEvent = incomingEventMap.get(storeEvent.id);

    if (matchingIncomingEvent) {
      out.toUpdate.push({
        ...matchingIncomingEvent,
        id: storeEvent.id,
        user_id: storeEvent.user_id,
        created_at: storeEvent.created_at,
      });
      handledIncomingEventIds.add(matchingIncomingEvent.id);
      continue;
    }

    const sessionId = getSessionForEvent(store, storeEvent.id);
    const hasNonEmptySession = sessionId && !isSessionEmpty(store, sessionId);

    if (hasNonEmptySession) {
      continue;
    }

    const rescheduledEvent = findRescheduledEvent(storeEvent, incoming);

    if (rescheduledEvent && !handledIncomingEventIds.has(rescheduledEvent.id)) {
      out.toDelete.push(storeEvent.id);
      out.toAdd.push(rescheduledEvent);
      handledIncomingEventIds.add(rescheduledEvent.id);
      continue;
    }

    out.toDelete.push(storeEvent.id);
  }

  for (const incomingEvent of incoming) {
    if (!handledIncomingEventIds.has(incomingEvent.id)) {
      out.toAdd.push(incomingEvent);
    }
  }

  return out;
}

function findRescheduledEvent(
  storeEvent: ExistingEvent,
  incomingEvents: Array<IncomingEvent>,
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

    if (incoming.calendar_id !== storeEvent.calendar_id) {
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

    if (incoming.id === storeEvent.id) {
      return false;
    }

    return true;
  });
}
