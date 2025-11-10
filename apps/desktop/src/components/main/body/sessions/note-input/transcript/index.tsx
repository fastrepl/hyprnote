import { useCallback } from "react";

import * as main from "../../../../../../store/tinybase/main";
import { id } from "../../../../../../utils";
import { TranscriptContainer } from "./shared";

export function Transcript({ sessionId, isEditing }: { sessionId: string; isEditing: boolean }) {
  const store = main.UI.useStore(main.STORE_ID);
  const indexes = main.UI.useIndexes(main.STORE_ID);
  const checkpoints = main.UI.useCheckpoints(main.STORE_ID);

  const handleDeleteWord = useCallback((wordId: string) => {
    if (!store || !indexes || !checkpoints) {
      return;
    }

    const speakerHintIds = indexes.getSliceRowIds(
      main.INDEXES.speakerHintsByWord,
      wordId,
    );

    speakerHintIds?.forEach((hintId) => {
      store.delRow("speaker_hints", hintId);
    });

    store.delRow("words", wordId);

    checkpoints.addCheckpoint("delete_word");
  }, [store, indexes, checkpoints]);

  const handleAssignSpeaker = useCallback((wordIds: string[], humanId: string) => {
    if (!store || !checkpoints) {
      return;
    }

    wordIds.forEach((wordId) => {
      const word = store.getRow("words", wordId);
      if (!word || typeof word.transcript_id !== "string") {
        return;
      }

      const hintId = id();
      store.setRow("speaker_hints", hintId, {
        transcript_id: word.transcript_id,
        word_id: wordId,
        type: "user_speaker_assignment",
        value: JSON.stringify({ human_id: humanId }),
        created_at: new Date().toISOString(),
      });
    });

    checkpoints.addCheckpoint("assign_speaker");
  }, [store, checkpoints]);

  const operations = isEditing
    ? {
      onDeleteWord: handleDeleteWord,
      onAssignSpeaker: handleAssignSpeaker,
    }
    : undefined;

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      <TranscriptContainer sessionId={sessionId} operations={operations} />
    </div>
  );
}
