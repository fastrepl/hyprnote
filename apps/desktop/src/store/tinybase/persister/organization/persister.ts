import type { OrganizationStorage } from "@hypr/store";
import type { Schemas } from "@hypr/store";

import type { Store } from "../../store/main";
import { createMarkdownDirPersister } from "../factories";
import {
  frontmatterToOrganization,
  organizationToFrontmatter,
} from "./transform";

export function createOrganizationPersister(store: Store) {
  return createMarkdownDirPersister<Schemas, OrganizationStorage>(store, {
    tableName: "organizations",
    dirName: "organizations",
    label: "OrganizationPersister",
    legacyJsonPath: "organizations.json",
    toFrontmatter: organizationToFrontmatter,
    fromFrontmatter: frontmatterToOrganization,
  });
}
