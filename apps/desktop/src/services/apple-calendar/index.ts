import type { Queries } from "tinybase/with-schemas";

import type { Schemas, Store } from "../../store/tinybase/store/main";
import { createCtx } from "./ctx";
import { fetchExistingEvents, fetchIncomingEvents } from "./fetch";
import {
  executeForEventsSync,
  executeForParticipantsSync,
  syncEvents,
  syncParticipants,
} from "./process";

export const CALENDAR_SYNC_TASK_ID = "calendarSync";

export async function syncCalendarEvents(
  store: Store,
  queries: Queries<Schemas>,
): Promise<void> {
  await Promise.all([
    new Promise((resolve) => setTimeout(resolve, 250)),
    run(store, queries),
  ]);
}

async function run(store: Store, queries: Queries<Schemas>) {
  const ctx = createCtx(store, queries);
  if (!ctx) {
    return null;
  }

  const { events: incoming, participants: incomingParticipants } =
    await fetchIncomingEvents(ctx);
  const existing = fetchExistingEvents(ctx);

  const eventsOut = syncEvents(ctx, { incoming, existing });
  const { trackingIdToEventId } = executeForEventsSync(ctx, eventsOut);

  const participantsOut = syncParticipants(ctx, {
    incomingParticipants,
    trackingIdToEventId,
  });
  executeForParticipantsSync(ctx, participantsOut);
}
