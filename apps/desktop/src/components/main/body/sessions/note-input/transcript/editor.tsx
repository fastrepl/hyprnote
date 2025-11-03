import { useCallback } from "react";

import * as main from "../../../../../../store/tinybase/main";
import { TranscriptContainer } from "./shared";

export function TranscriptEditor({ sessionId }: { sessionId: string }) {
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

  return (
    <TranscriptContainer
      sessionId={sessionId}
      operations={{ onDeleteWord: handleDeleteWord }}
    />
  );
}
