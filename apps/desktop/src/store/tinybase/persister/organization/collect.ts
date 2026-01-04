import type { MergeableStore, OptionalSchemas } from "tinybase/with-schemas";

import type { FrontmatterInput, JsonValue } from "@hypr/plugin-export";
import type { OrganizationStorage } from "@hypr/store";

import type { CollectorResult, TablesContent } from "../utils";
import { getOrganizationDir, getOrganizationFilePath } from "./utils";

export interface OrganizationCollectorResult extends CollectorResult {
  validOrgIds: Set<string>;
}

type OrganizationsTable = Record<string, OrganizationStorage>;

export function collectOrganizationWriteOps<Schemas extends OptionalSchemas>(
  _store: MergeableStore<Schemas>,
  tables: TablesContent,
  dataDir: string,
): OrganizationCollectorResult {
  const dirs = new Set<string>();
  const operations: CollectorResult["operations"] = [];
  const validOrgIds = new Set<string>();

  const organizationsDir = getOrganizationDir(dataDir);
  dirs.add(organizationsDir);

  const organizations =
    (tables as { organizations?: OrganizationsTable }).organizations ?? {};

  const frontmatterItems: [FrontmatterInput, string][] = [];

  for (const [orgId, org] of Object.entries(organizations)) {
    validOrgIds.add(orgId);

    const frontmatter: Record<string, JsonValue> = {
      created_at: org.created_at ?? "",
      name: org.name ?? "",
      user_id: org.user_id ?? "",
    };

    const body = "";
    const filePath = getOrganizationFilePath(dataDir, orgId);

    frontmatterItems.push([{ frontmatter, content: body }, filePath]);
  }

  if (frontmatterItems.length > 0) {
    operations.push({
      type: "frontmatter-batch",
      items: frontmatterItems,
    });
  }

  return { dirs, operations, validOrgIds };
}
