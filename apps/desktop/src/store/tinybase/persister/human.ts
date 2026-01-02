import type { MergeableStore, OptionalSchemas } from "tinybase/with-schemas";

import { createSimpleJsonPersister, type PersisterMode } from "./utils";

export function createHumanPersister<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
  config: { mode: PersisterMode } = { mode: "save-only" },
) {
  return createSimpleJsonPersister(store, {
    tableName: "humans",
    filename: "humans.json",
    label: "HumanPersister",
    mode: config.mode,
  });
}
