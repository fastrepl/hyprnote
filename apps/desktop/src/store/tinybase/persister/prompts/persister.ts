import type {
  Content,
  MergeableStore,
  OptionalSchemas,
} from "tinybase/with-schemas";

import { createSessionDirPersister, getDataDir } from "../utils";
import { collectPromptWriteOps, type PromptCollectorResult } from "./collect";
import { cleanupOrphanPromptFiles, loadAllPrompts } from "./load";
import { migratePromptsJsonIfNeeded } from "./migrate";

export function createPromptPersister<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
) {
  return createSessionDirPersister(store, {
    label: "PromptPersister",
    collect: collectPromptWriteOps,
    load: async (): Promise<Content<Schemas> | undefined> => {
      const dataDir = await getDataDir();
      await migratePromptsJsonIfNeeded(dataDir);
      const prompts = await loadAllPrompts(dataDir);
      if (Object.keys(prompts).length === 0) {
        return undefined;
      }
      return [{ prompts }, {}] as unknown as Content<Schemas>;
    },
    postSave: async (dataDir, result) => {
      const { validPromptIds } = result as PromptCollectorResult;
      await cleanupOrphanPromptFiles(dataDir, validPromptIds);
    },
  });
}
