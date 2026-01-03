import type {
  Content,
  MergeableStore,
  OptionalSchemas,
} from "tinybase/with-schemas";

import {
  createSessionDirPersister,
  getDataDir,
  type PersisterMode,
} from "../utils";
import { collectSessionWriteOps, type SessionCollectorResult } from "./collect";
import { cleanupOrphanSessionDirs, loadAllSessionMeta } from "./load";

export function createSessionPersister<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
  config: { mode: PersisterMode } = { mode: "save-only" },
) {
  let lastValidSessionIds: Set<string> = new Set();

  return createSessionDirPersister(store, {
    label: "SessionPersister",
    mode: config.mode,
    collect: (store, tables, dataDir) => {
      const result: SessionCollectorResult = collectSessionWriteOps(
        store,
        tables,
        dataDir,
      );
      lastValidSessionIds = result.validSessionIds;
      return result;
    },
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
    postSave: async (dataDir) => {
      await cleanupOrphanSessionDirs(dataDir, lastValidSessionIds);
    },
  });
}
