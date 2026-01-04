import type { OrganizationStorage } from "@hypr/store";

import { migrateJsonToMarkdown } from "../markdown-utils";
import { organizationToFrontmatter } from "./utils";

const LABEL = "OrganizationPersister";
const DIR_NAME = "organizations";
const JSON_FILENAME = "organizations.json";

export async function migrateOrganizationsJsonIfNeeded(
  dataDir: string,
): Promise<void> {
  return migrateJsonToMarkdown<OrganizationStorage>(
    dataDir,
    JSON_FILENAME,
    DIR_NAME,
    LABEL,
    (_id, org) => organizationToFrontmatter(org),
  );
}
