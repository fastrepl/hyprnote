import type { Queries } from "tinybase/with-schemas";

import type { Schemas, Store } from "../../store/tinybase/store/main";
import { createCtx } from "./ctx";
import {
  CalendarFetchError,
  fetchExistingEvents,
  fetchIncomingEvents,
} from "./fetch";
import { migrateEventIds } from "./migrate/event-ids";
import {
  executeForEventsSync,
  executeForParticipantsSync,
  syncEvents,
  syncParticipants,
} from "./process";

export const CALENDAR_SYNC_TASK_ID = "calendarSync";

let migrationRun = false;

export async function syncCalendarEvents(
  store: Store,
  queries: Queries<Schemas>,
): Promise<void> {
  if (!migrationRun) {
    await migrateEventIds(store);
    migrationRun = true;
  }

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

  let incoming;
  let incomingParticipants;

  try {
    const result = await fetchIncomingEvents(ctx);
    incoming = result.events;
    incomingParticipants = result.participants;
  } catch (error) {
    if (error instanceof CalendarFetchError) {
      console.error(
        `[calendar-sync] Aborting sync due to fetch error: ${error.message}`,
      );
      return null;
    }
    throw error;
  }

  const existing = fetchExistingEvents(ctx);

  const eventsOut = syncEvents(ctx, { incoming, existing });
  const { trackingIdToEventId } = executeForEventsSync(ctx, eventsOut);

  const participantsOut = syncParticipants(ctx, {
    incomingParticipants,
    trackingIdToEventId,
  });
  executeForParticipantsSync(ctx, participantsOut);
}
