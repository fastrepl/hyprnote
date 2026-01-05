import type {
  Content,
  MergeableStore,
  OptionalSchemas,
} from "tinybase/with-schemas";

import { commands as fsSyncCommands } from "@hypr/plugin-fs-sync";

import { createCollectorPersister, getDataDir } from "../utils";
import { collectSessionWriteOps, type SessionCollectorResult } from "./collect";
import { loadAllSessionMeta } from "./load";

export function createSessionPersister<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
) {
  return createCollectorPersister(store, {
    label: "SessionPersister",
    collect: (store, tables, dataDir) =>
      collectSessionWriteOps(store, tables, dataDir),
    load: async (): Promise<Content<Schemas> | undefined> => {
      try {
        const dataDir = await getDataDir();
        const data = await loadAllSessionMeta(dataDir);
        return [
          {
            sessions: data.sessions,
            mapping_session_participant: data.mapping_session_participant,
            tags: data.tags,
            mapping_tag_session: data.mapping_tag_session,
          },
          {},
        ] as unknown as Content<Schemas>;
      } catch (error) {
        console.error("[SessionPersister] load error:", error);
        return undefined;
      }
    },
    postSave: async (_dataDir, result) => {
      const { validSessionIds } = result as SessionCollectorResult;
      await fsSyncCommands.cleanupOrphanDirs(
        "sessions",
        "_meta.json",
        Array.from(validSessionIds),
      );
    },
  });
}
