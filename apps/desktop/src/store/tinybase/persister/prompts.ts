import type { MergeableStore, OptionalSchemas } from "tinybase/with-schemas";

import { createSimpleJsonPersister, type PersisterMode } from "./utils";

export function createPromptPersister<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
  config: { mode: PersisterMode } = { mode: "save-only" },
) {
  return createSimpleJsonPersister(store, {
    tableName: "prompts",
    filename: "prompts.json",
    label: "PromptPersister",
    mode: config.mode,
  });
}
