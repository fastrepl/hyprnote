import type { MergeableStore, OptionalSchemas } from "tinybase/with-schemas";

import { createSimpleJsonPersister, type PersisterMode } from "./utils";

export function createTemplatePersister<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
  config: { mode: PersisterMode } = { mode: "save-only" },
) {
  return createSimpleJsonPersister(store, {
    tableName: "templates",
    filename: "templates.json",
    label: "TemplatePersister",
    mode: config.mode,
  });
}
