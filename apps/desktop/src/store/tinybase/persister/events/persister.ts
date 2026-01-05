import type { MergeableStore, OptionalSchemas } from "tinybase/with-schemas";

import { createJsonFilePersister } from "../factories";

export function createEventPersister<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
) {
  return createJsonFilePersister(store, {
    tableName: "events",
    filename: "events.json",
    label: "EventPersister",
  });
}
