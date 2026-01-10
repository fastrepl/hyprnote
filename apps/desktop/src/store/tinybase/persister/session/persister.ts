import type { Schemas } from "@hypr/store";

import type { Store } from "../../store/main";
import { createMultiTableDirPersister } from "../factories";
import type { TablesContent } from "../shared";
import { getChangedSessionIds, parseSessionIdFromPath } from "./changes";
import {
  loadAllSessionData,
  type LoadedSessionData,
  loadSingleSession,
} from "./load/index";
import {
  buildNoteSaveOps,
  buildSessionSaveOps,
  buildTranscriptSaveOps,
} from "./save/index";

export function createSessionPersister(store: Store) {
  return createMultiTableDirPersister<Schemas, LoadedSessionData>(store, {
    label: "SessionPersister",
    dirName: "sessions",
    entityParser: parseSessionIdFromPath,
    tables: [
      { tableName: "sessions", isPrimary: true },
      { tableName: "mapping_session_participant", foreignKey: "session_id" },
      { tableName: "tags" },
      { tableName: "mapping_tag_session", foreignKey: "session_id" },
      { tableName: "transcripts", foreignKey: "session_id" },
      { tableName: "enhanced_notes", foreignKey: "session_id" },
    ],
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
    loadAll: loadAllSessionData,
    loadSingle: loadSingleSession,
    save: (store, tables, dataDir, changedTables) => {
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

      const sessionOps = buildSessionSaveOps(
        store,
        tables,
        dataDir,
        changedSessionIds,
      );
      const transcriptOps = buildTranscriptSaveOps(
        tables,
        dataDir,
        changedSessionIds,
      );
      const noteOps = buildNoteSaveOps(
        store,
        tables,
        dataDir,
        changedSessionIds,
      );

      return {
        operations: [...sessionOps, ...transcriptOps, ...noteOps],
      };
    },
  });
}

function getValidSessionIds(tables: TablesContent): Set<string> {
  return new Set(Object.keys(tables.sessions ?? {}));
}

function getValidNoteIds(tables: TablesContent): Set<string> {
  return new Set(Object.keys(tables.enhanced_notes ?? {}));
}

function getSessionsWithMemo(tables: TablesContent): Set<string> {
  return new Set(
    Object.entries(tables.sessions ?? {})
      .filter(([, s]) => s.raw_md)
      .map(([id]) => id),
  );
}
