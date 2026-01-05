import type { OrganizationStorage } from "@hypr/store";

import { loadAllEntities } from "../markdown-utils";
import { frontmatterToOrganization } from "./utils";

const LABEL = "OrganizationPersister";
const DIR_NAME = "organizations";

export async function loadAllOrganizations(
  dataDir: string,
): Promise<Record<string, OrganizationStorage>> {
  return loadAllEntities(dataDir, DIR_NAME, LABEL, frontmatterToOrganization);
}
