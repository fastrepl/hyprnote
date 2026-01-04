import type { MergeableStore, OptionalSchemas } from "tinybase/with-schemas";

import { createSingleTablePersister } from "../utils";

export function createEventPersister<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
) {
  return createSingleTablePersister(store, {
    tableName: "events",
    filename: "events.json",
    label: "EventPersister",
  });
}
