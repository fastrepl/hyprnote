import type { MergeableStore, OptionalSchemas } from "tinybase/with-schemas";

import { createSingleTablePersister } from "../utils";

export function createCalendarPersister<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
) {
  return createSingleTablePersister(store, {
    tableName: "calendars",
    filename: "calendars.json",
    label: "CalendarPersister",
  });
}
