import type { MergeableStore, OptionalSchemas } from "tinybase/with-schemas";

import type { FrontmatterInput, JsonValue } from "@hypr/plugin-export";
import type { HumanStorage } from "@hypr/store";

import type { CollectorResult, TablesContent } from "../utils";
import { getHumanDir, getHumanFilePath } from "./utils";

export interface HumanCollectorResult extends CollectorResult {
  validHumanIds: Set<string>;
}

type HumansTable = Record<string, HumanStorage>;

export function collectHumanWriteOps<Schemas extends OptionalSchemas>(
  _store: MergeableStore<Schemas>,
  tables: TablesContent,
  dataDir: string,
): HumanCollectorResult {
  const dirs = new Set<string>();
  const operations: CollectorResult["operations"] = [];
  const validHumanIds = new Set<string>();

  const humansDir = getHumanDir(dataDir);
  dirs.add(humansDir);

  const humans = (tables as { humans?: HumansTable }).humans ?? {};

  const frontmatterItems: [FrontmatterInput, string][] = [];

  for (const [humanId, human] of Object.entries(humans)) {
    validHumanIds.add(humanId);

    const { memo, ...frontmatterFields } = human;

    const frontmatter: Record<string, JsonValue> = {
      user_id: frontmatterFields.user_id ?? "",
      created_at: frontmatterFields.created_at ?? "",
      name: frontmatterFields.name ?? "",
      email: frontmatterFields.email ?? "",
      org_id: frontmatterFields.org_id ?? "",
      job_title: frontmatterFields.job_title ?? "",
      linkedin_username: frontmatterFields.linkedin_username ?? "",
    };

    const body = memo ?? "";
    const filePath = getHumanFilePath(dataDir, humanId);

    frontmatterItems.push([{ frontmatter, content: body }, filePath]);
  }

  if (frontmatterItems.length > 0) {
    operations.push({
      type: "frontmatter-batch",
      items: frontmatterItems,
    });
  }

  return { dirs, operations, validHumanIds };
}
