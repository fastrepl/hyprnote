import type {
  Content,
  MergeableStore,
  OptionalSchemas,
} from "tinybase/with-schemas";

import {
  asTableChanges,
  createSessionDirPersister,
  getDataDir,
} from "../utils";
import { collectHumanWriteOps, type HumanCollectorResult } from "./collect";
import { cleanupOrphanHumanFiles, loadAllHumans } from "./load";
import { migrateHumansJsonIfNeeded } from "./migrate";

export function createHumanPersister<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
) {
  return createSessionDirPersister(store, {
    label: "HumanPersister",
    collect: collectHumanWriteOps,
    load: async (): Promise<Content<Schemas> | undefined> => {
      const dataDir = await getDataDir();
      await migrateHumansJsonIfNeeded(dataDir);
      const humans = await loadAllHumans(dataDir);
      if (Object.keys(humans).length === 0) {
        return undefined;
      }
      return asTableChanges("humans", humans) as Content<Schemas>;
    },
    postSave: async (dataDir, result) => {
      const { validHumanIds } = result as HumanCollectorResult;
      await cleanupOrphanHumanFiles(dataDir, validHumanIds);
    },
  });
}
