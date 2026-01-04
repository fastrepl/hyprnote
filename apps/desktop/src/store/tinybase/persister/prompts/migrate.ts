import type { PromptStorage } from "@hypr/store";

import { migrateJsonToMarkdown } from "../markdown-utils";
import { promptToFrontmatter } from "./utils";

const LABEL = "PromptPersister";
const JSON_FILENAME = "prompts.json";
const DIR_NAME = "prompts";

export async function migratePromptsJsonIfNeeded(
  dataDir: string,
): Promise<void> {
  return migrateJsonToMarkdown<PromptStorage>(
    dataDir,
    JSON_FILENAME,
    DIR_NAME,
    LABEL,
    (_id, prompt) => promptToFrontmatter(prompt),
  );
}
