import type { Queries } from "tinybase/with-schemas";

import type { Schemas, Store } from "../../store/tinybase/main";
import { createCtx } from "./ctx";
import { fetchExistingEvents, fetchIncomingEvents } from "./fetch";
import { execute, sync } from "./process";

export const CALENDAR_SYNC_TASK_ID = "calendarSync";

export async function syncCalendarEvents(
  store: Store,
  queries: Queries<Schemas>,
): Promise<void> {
  await Promise.all([
    new Promise((resolve) => setTimeout(resolve, 250)),
    runSyncPipeline(store, queries),
  ]);
}

async function runSyncPipeline(store: Store, queries: Queries<Schemas>) {
  const ctx = createCtx(store, queries);
  if (!ctx) {
    return null;
  }

  const incoming = await fetchIncomingEvents(ctx);
  const existing = fetchExistingEvents(ctx);

  const out = sync(ctx.store, { incoming, existing });
  execute(ctx.store, out);
}
