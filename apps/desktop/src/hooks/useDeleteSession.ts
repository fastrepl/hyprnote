import { useCallback } from "react";

import { commands as miscCommands } from "@hypr/plugin-misc";

import * as main from "../store/tinybase/main";
import { save } from "../store/tinybase/save";
import { useTabs } from "../store/zustand/tabs";

export function useDeleteSession() {
  const store = main.UI.useStore(main.STORE_ID);
  const indexes = main.UI.useIndexes(main.STORE_ID);
  const invalidateResource = useTabs((state) => state.invalidateResource);

  return useCallback(
    async (sessionId: string) => {
      if (!store || !indexes) {
        return;
      }

      invalidateResource("sessions", sessionId);

      store.transaction(() => {
        const transcriptIds = indexes.getSliceRowIds(
          main.INDEXES.transcriptBySession,
          sessionId,
        );

        for (const transcriptId of transcriptIds) {
          const wordIds = indexes.getSliceRowIds(
            main.INDEXES.wordsByTranscript,
            transcriptId,
          );
          for (const wordId of wordIds) {
            store.delRow("words", wordId);
          }

          const speakerHintIds = indexes.getSliceRowIds(
            main.INDEXES.speakerHintsByTranscript,
            transcriptId,
          );
          for (const speakerHintId of speakerHintIds) {
            store.delRow("speaker_hints", speakerHintId);
          }

          store.delRow("transcripts", transcriptId);
        }

        const enhancedNoteIds = indexes.getSliceRowIds(
          main.INDEXES.enhancedNotesBySession,
          sessionId,
        );
        for (const enhancedNoteId of enhancedNoteIds) {
          store.delRow("enhanced_notes", enhancedNoteId);
        }

        const participantMappingIds = indexes.getSliceRowIds(
          main.INDEXES.sessionParticipantsBySession,
          sessionId,
        );
        for (const mappingId of participantMappingIds) {
          store.delRow("mapping_session_participant", mappingId);
        }

        const tagMappingIds = indexes.getSliceRowIds(
          main.INDEXES.tagSessionsBySession,
          sessionId,
        );
        for (const mappingId of tagMappingIds) {
          store.delRow("mapping_tag_session", mappingId);
        }

        store.delRow("sessions", sessionId);
      });

      await save();

      void miscCommands.deleteSessionFolder(sessionId);
    },
    [store, indexes, invalidateResource],
  );
}
