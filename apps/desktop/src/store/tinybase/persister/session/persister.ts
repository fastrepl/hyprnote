import type {
  Content,
  MergeableStore,
  OptionalSchemas,
} from "tinybase/with-schemas";

import { commands as fsSyncCommands } from "@hypr/plugin-fs-sync";

import {
  asTablesChanges,
  type CollectorResult,
  createCollectorPersister,
  getDataDir,
} from "../utils";
import {
  collectNoteWriteOps,
  collectSessionWriteOps,
  collectTranscriptWriteOps,
  type SessionCollectorResult,
} from "./collect";
import { loadAllSessionData } from "./load";

export function createSessionPersister<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
) {
  return createCollectorPersister(store, {
    label: "SessionPersister",
    collect: (store, tables, dataDir) => {
      const sessionResult = collectSessionWriteOps(
        store,
        tables,
        dataDir,
      ) as SessionCollectorResult;
      const transcriptResult = collectTranscriptWriteOps(
        store,
        tables,
        dataDir,
      );
      const noteResult = collectNoteWriteOps(store, tables, dataDir);

      const dirs = new Set([
        ...sessionResult.dirs,
        ...transcriptResult.dirs,
        ...noteResult.dirs,
      ]);
      const operations = [
        ...sessionResult.operations,
        ...transcriptResult.operations,
        ...noteResult.operations,
      ];

      return {
        dirs,
        operations,
        validSessionIds: sessionResult.validSessionIds,
      };
    },
    load: async (): Promise<Content<Schemas> | undefined> => {
      try {
        const dataDir = await getDataDir();
        const data = await loadAllSessionData(dataDir);

        const hasData =
          Object.keys(data.sessions).length > 0 ||
          Object.keys(data.transcripts).length > 0 ||
          Object.keys(data.enhanced_notes).length > 0;

        if (!hasData) {
          return undefined;
        }

        return asTablesChanges({
          sessions: data.sessions,
          mapping_session_participant: data.mapping_session_participant,
          tags: data.tags,
          mapping_tag_session: data.mapping_tag_session,
          transcripts: data.transcripts,
          words: data.words,
          speaker_hints: data.speaker_hints,
          enhanced_notes: data.enhanced_notes,
        }) as unknown as Content<Schemas>;
      } catch (error) {
        console.error("[SessionPersister] load error:", error);
        return undefined;
      }
    },
    postSave: async (_dataDir, result) => {
      const { validSessionIds } = result as CollectorResult & {
        validSessionIds: Set<string>;
      };
      await fsSyncCommands.cleanupOrphanDirs(
        "sessions",
        "_meta.json",
        Array.from(validSessionIds),
      );
    },
  });
}
