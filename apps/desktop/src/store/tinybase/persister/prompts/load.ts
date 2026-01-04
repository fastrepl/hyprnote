import type { PromptStorage } from "@hypr/store";

import { cleanupOrphanFiles, loadAllEntities } from "../markdown-utils";
import { frontmatterToPrompt } from "./utils";

const LABEL = "PromptPersister";
const DIR_NAME = "prompts";

export async function loadAllPrompts(
  dataDir: string,
): Promise<Record<string, PromptStorage>> {
  return loadAllEntities(dataDir, DIR_NAME, LABEL, frontmatterToPrompt);
}

export async function cleanupOrphanPromptFiles(
  dataDir: string,
  validPromptIds: Set<string>,
): Promise<void> {
  return cleanupOrphanFiles(dataDir, DIR_NAME, validPromptIds, LABEL);
}
