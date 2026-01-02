import type { MergeableStore, OptionalSchemas } from "tinybase/with-schemas";

import { createSimpleJsonPersister, type PersisterMode } from "./utils";

export function createCalendarPersister<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
  config: { mode: PersisterMode } = { mode: "save-only" },
) {
  return createSimpleJsonPersister(store, {
    tableName: "calendars",
    filename: "calendars.json",
    label: "CalendarPersister",
    mode: config.mode,
  });
}
