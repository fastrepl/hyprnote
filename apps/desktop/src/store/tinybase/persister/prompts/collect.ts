import type { MergeableStore, OptionalSchemas } from "tinybase/with-schemas";

import type { ParsedDocument } from "@hypr/plugin-fs-sync";
import type { PromptStorage } from "@hypr/store";

import type { CollectorResult, TablesContent } from "../utils";
import { getPromptDir, getPromptFilePath, promptToFrontmatter } from "./utils";

export interface PromptCollectorResult extends CollectorResult {
  validPromptIds: Set<string>;
}

type PromptsTable = Record<string, PromptStorage>;

export function collectPromptWriteOps<Schemas extends OptionalSchemas>(
  _store: MergeableStore<Schemas>,
  tables: TablesContent,
  dataDir: string,
): PromptCollectorResult {
  const dirs = new Set<string>();
  const operations: CollectorResult["operations"] = [];
  const validPromptIds = new Set<string>();

  const promptsDir = getPromptDir(dataDir);
  dirs.add(promptsDir);

  const prompts = (tables as { prompts?: PromptsTable }).prompts ?? {};

  const frontmatterItems: [ParsedDocument, string][] = [];

  for (const [promptId, prompt] of Object.entries(prompts)) {
    validPromptIds.add(promptId);

    const { frontmatter, body } = promptToFrontmatter(prompt);
    const filePath = getPromptFilePath(dataDir, promptId);

    frontmatterItems.push([{ frontmatter, content: body }, filePath]);
  }

  if (frontmatterItems.length > 0) {
    operations.push({
      type: "frontmatter-batch",
      items: frontmatterItems,
    });
  }

  return { dirs, operations, validPromptIds };
}
