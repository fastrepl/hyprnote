import type {
  PersistedChanges,
  Persists,
} from "tinybase/persisters/with-schemas";
import type { Content } from "tinybase/with-schemas";

import type { Schemas } from "@hypr/store";

import type { Store } from "../../store/main";
import { createCollectorPersister } from "../factories";
import { asTablesChanges, getDataDir } from "../shared";
import {
  createSessionDeletionMarker,
  getChangedSessionIds,
  parseSessionIdFromPath,
} from "./changes";
import {
  collectNoteWriteOps,
  collectSessionWriteOps,
  collectTranscriptWriteOps,
} from "./collect/index";
import { loadAllSessionData, loadSingleSession } from "./load/index";
import {
  getSessionsWithMemo,
  getValidNoteIds,
  getValidSessionIds,
} from "./validators";

export function createSessionPersister(store: Store) {
  const deletionMarker = createSessionDeletionMarker(store);

  return createCollectorPersister(store, {
    label: "SessionPersister",
    watchPaths: ["sessions/"],
    cleanup: [
      {
        type: "dirs",
        subdir: "sessions",
        markerFile: "_meta.json",
        getValidIds: getValidSessionIds,
      },
      {
        type: "sessionNotes",
        getValidIds: getValidNoteIds,
        getSessionsWithMemo: getSessionsWithMemo,
      },
    ],
    entityParser: parseSessionIdFromPath,
    loadSingle: async (sessionId: string) => {
      try {
        const dataDir = await getDataDir();
        const data = await loadSingleSession(dataDir, sessionId);

        const result = deletionMarker.markForEntity(data, sessionId);

        const hasChanges =
          Object.keys(result.sessions).length > 0 ||
          Object.keys(result.mapping_session_participant).length > 0 ||
          Object.keys(result.tags).length > 0 ||
          Object.keys(result.mapping_tag_session).length > 0 ||
          Object.keys(result.transcripts).length > 0 ||
          Object.keys(result.enhanced_notes).length > 0;

        if (!hasChanges) {
          return undefined;
        }

        return asTablesChanges({
          sessions: result.sessions,
          mapping_session_participant: result.mapping_session_participant,
          tags: result.tags,
          mapping_tag_session: result.mapping_tag_session,
          transcripts: result.transcripts,
          enhanced_notes: result.enhanced_notes,
        }) as unknown as PersistedChanges<
          Schemas,
          Persists.StoreOrMergeableStore
        >;
      } catch (error) {
        console.error(
          `[SessionPersister] loadSingle error for ${sessionId}:`,
          error,
        );
        return undefined;
      }
    },
    collect: (store, tables, dataDir, changedTables) => {
      let changedSessionIds: Set<string> | undefined;

      if (changedTables) {
        const changeResult = getChangedSessionIds(tables, changedTables);
        if (!changeResult) {
          return { operations: [] };
        }

        if (changeResult.hasUnresolvedDeletions) {
          changedSessionIds = undefined;
        } else {
          changedSessionIds = changeResult.changedSessionIds;
        }
      }

      const sessionOps = collectSessionWriteOps(
        store,
        tables,
        dataDir,
        changedSessionIds,
      );
      const transcriptOps = collectTranscriptWriteOps(
        tables,
        dataDir,
        changedSessionIds,
      );
      const noteOps = collectNoteWriteOps(
        store,
        tables,
        dataDir,
        changedSessionIds,
      );

      return {
        operations: [...sessionOps, ...transcriptOps, ...noteOps],
      };
    },
    load: async () => {
      try {
        const dataDir = await getDataDir();
        const data = await loadAllSessionData(dataDir);

        const result = deletionMarker.markAll(data);

        const hasChanges =
          Object.keys(result.sessions).length > 0 ||
          Object.keys(result.mapping_session_participant).length > 0 ||
          Object.keys(result.tags).length > 0 ||
          Object.keys(result.mapping_tag_session).length > 0 ||
          Object.keys(result.transcripts).length > 0 ||
          Object.keys(result.enhanced_notes).length > 0;

        if (!hasChanges) {
          return undefined;
        }

        return asTablesChanges({
          sessions: result.sessions,
          mapping_session_participant: result.mapping_session_participant,
          tags: result.tags,
          mapping_tag_session: result.mapping_tag_session,
          transcripts: result.transcripts,
          enhanced_notes: result.enhanced_notes,
        }) as unknown as Content<Schemas>;
      } catch (error) {
        console.error("[SessionPersister] load error:", error);
        return undefined;
      }
    },
  });
}
