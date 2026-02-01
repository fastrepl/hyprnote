import { useCallback } from "react";

import { commands as fsSyncCommands } from "@hypr/plugin-fs-sync";

import * as main from "./main";

type Store = NonNullable<ReturnType<typeof main.UI.useStore>>;
type Indexes = NonNullable<ReturnType<typeof main.UI.useIndexes>>;

function deleteByIndex(
  store: Store,
  indexes: Indexes,
  indexName: string,
  key: string,
  tableName: (typeof main.TABLES)[number],
): void {
  const ids = indexes.getSliceRowIds(indexName, key);
  for (const id of ids) {
    store.delRow(tableName, id);
  }
}

export function deleteSessionCascade(
  store: Store,
  indexes: ReturnType<typeof main.UI.useIndexes>,
  sessionId: string,
): void {
  if (!indexes) {
    store.delRow("sessions", sessionId);
  } else {
    store.transaction(() => {
      const transcriptIds = indexes.getSliceRowIds(
        main.INDEXES.transcriptBySession,
        sessionId,
      );

      for (const transcriptId of transcriptIds) {
        store.delRow("transcripts", transcriptId);
      }

      deleteByIndex(
        store,
        indexes,
        main.INDEXES.sessionParticipantsBySession,
        sessionId,
        "mapping_session_participant",
      );
      deleteByIndex(
        store,
        indexes,
        main.INDEXES.tagSessionsBySession,
        sessionId,
        "mapping_tag_session",
      );
      deleteByIndex(
        store,
        indexes,
        main.INDEXES.enhancedNotesBySession,
        sessionId,
        "enhanced_notes",
      );

      store.delRow("sessions", sessionId);
    });
  }

  void fsSyncCommands.audioDelete(sessionId);
}

export function useDeleteSession() {
  const store = main.UI.useStore(main.STORE_ID);
  const indexes = main.UI.useIndexes(main.STORE_ID);

  return useCallback(
    (sessionId: string) => {
      if (!store) return;
      void deleteSessionCascade(store, indexes, sessionId);
    },
    [store, indexes],
  );
}
