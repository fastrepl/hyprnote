import type { MergeableStore, OptionalSchemas } from "tinybase/with-schemas";

import { createSingleTablePersister } from "../utils";

export function createTemplatePersister<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
) {
  return createSingleTablePersister(store, {
    tableName: "templates",
    filename: "templates.json",
    label: "TemplatePersister",
  });
}
