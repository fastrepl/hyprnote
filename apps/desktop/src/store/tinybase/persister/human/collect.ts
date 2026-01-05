import type { MergeableStore, OptionalSchemas } from "tinybase/with-schemas";

import type { ParsedDocument } from "@hypr/plugin-fs-sync";
import type { HumanStorage } from "@hypr/store";

import type { CollectorResult, TablesContent } from "../utils";
import { getHumanDir, getHumanFilePath, humanToFrontmatter } from "./utils";

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

  const frontmatterItems: [ParsedDocument, string][] = [];

  for (const [humanId, human] of Object.entries(humans)) {
    validHumanIds.add(humanId);

    const { frontmatter, body } = humanToFrontmatter(human);
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
