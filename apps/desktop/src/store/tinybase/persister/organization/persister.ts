import type {
  Content,
  MergeableStore,
  OptionalSchemas,
} from "tinybase/with-schemas";

import { commands as folderCommands } from "@hypr/plugin-folder";

import { createSessionDirPersister, getDataDir } from "../utils";
import {
  collectOrganizationWriteOps,
  type OrganizationCollectorResult,
} from "./collect";
import { loadAllOrganizations } from "./load";
import { migrateOrganizationsJsonIfNeeded } from "./migrate";

export function createOrganizationPersister<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
) {
  return createSessionDirPersister(store, {
    label: "OrganizationPersister",
    collect: collectOrganizationWriteOps,
    load: async (): Promise<Content<Schemas> | undefined> => {
      const dataDir = await getDataDir();
      await migrateOrganizationsJsonIfNeeded(dataDir);
      const organizations = await loadAllOrganizations(dataDir);
      if (Object.keys(organizations).length === 0) {
        return undefined;
      }
      return [{ organizations }, {}] as unknown as Content<Schemas>;
    },
    postSave: async (_dataDir, result) => {
      const { validOrgIds } = result as OrganizationCollectorResult;
      await folderCommands.cleanupOrphanFiles(
        "organizations",
        "md",
        Array.from(validOrgIds),
      );
    },
  });
}
