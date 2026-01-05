import type { MergeableStore, OptionalSchemas } from "tinybase/with-schemas";

import { createJsonFilePersister } from "../utils";

export function createTemplatePersister<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
) {
  return createJsonFilePersister(store, {
    tableName: "templates",
    filename: "templates.json",
    label: "TemplatePersister",
  });
}
