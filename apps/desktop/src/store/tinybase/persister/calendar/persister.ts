import type { MergeableStore, OptionalSchemas } from "tinybase/with-schemas";

import { createJsonFilePersister } from "../factories";

export function createCalendarPersister<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
) {
  return createJsonFilePersister(store, {
    tableName: "calendars",
    filename: "calendars.json",
    label: "CalendarPersister",
  });
}
