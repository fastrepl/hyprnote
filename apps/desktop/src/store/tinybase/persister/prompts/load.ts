import type { PromptStorage } from "@hypr/store";

import { loadAllEntities } from "../markdown-utils";
import { frontmatterToPrompt } from "./utils";

const LABEL = "PromptPersister";
const DIR_NAME = "prompts";

export async function loadAllPrompts(
  dataDir: string,
): Promise<Record<string, PromptStorage>> {
  return loadAllEntities(dataDir, DIR_NAME, LABEL, frontmatterToPrompt);
}
