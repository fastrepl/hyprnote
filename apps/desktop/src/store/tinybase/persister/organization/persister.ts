import type { MergeableStore, OptionalSchemas } from "tinybase/with-schemas";

import type { OrganizationStorage } from "@hypr/store";

import { createEntityPersister } from "../utils";
import {
  frontmatterToOrganization,
  organizationToFrontmatter,
} from "./transform";

export function createOrganizationPersister<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
) {
  return createEntityPersister<Schemas, OrganizationStorage>(store, {
    tableName: "organizations",
    dirName: "organizations",
    label: "OrganizationPersister",
    jsonFilename: "organizations.json",
    toFrontmatter: organizationToFrontmatter,
    fromFrontmatter: frontmatterToOrganization,
  });
}
