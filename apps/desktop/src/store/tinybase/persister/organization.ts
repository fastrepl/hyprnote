import type { MergeableStore, OptionalSchemas } from "tinybase/with-schemas";

import { createSimpleJsonPersister, type PersisterMode } from "./utils";

export function createOrganizationPersister<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
  config: { mode: PersisterMode } = { mode: "save-only" },
) {
  return createSimpleJsonPersister(store, {
    tableName: "organizations",
    filename: "organizations.json",
    label: "OrganizationPersister",
    mode: config.mode,
  });
}
