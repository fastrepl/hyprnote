import type { MergeableStore, OptionalSchemas } from "tinybase/with-schemas";

import { createSingleTablePersister } from "../utils";

export function createOrganizationPersister<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
) {
  return createSingleTablePersister(store, {
    tableName: "organizations",
    filename: "organizations.json",
    label: "OrganizationPersister",
  });
}
