import type { MergeableStore, OptionalSchemas } from "tinybase/with-schemas";

import type { OrganizationStorage } from "@hypr/store";

import { createMarkdownDirPersister } from "../factories";
import {
  frontmatterToOrganization,
  organizationToFrontmatter,
} from "./transform";

export function createOrganizationPersister<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
) {
  return createMarkdownDirPersister<Schemas, OrganizationStorage>(store, {
    tableName: "organizations",
    dirName: "organizations",
    label: "OrganizationPersister",
    legacyJsonPath: "organizations.json",
    toFrontmatter: organizationToFrontmatter,
    fromFrontmatter: frontmatterToOrganization,
  });
}
