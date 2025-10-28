import { useMemo } from "react";

import { useListener } from "../../../../../../../contexts/listener";
import * as persisted from "../../../../../../../store/tinybase/persisted";
import { buildSegments, mergeWordsByChannel, type PartialWord } from "../../../../../../../utils/segments";

export function useMergedWordsByChannel(
  finalWords: Record<string, persisted.Word>,
  partialWords: Record<number, PartialWord[]>,
) {
  return useMemo(
    () => mergeWordsByChannel(finalWords, partialWords),
    [finalWords, partialWords],
  );
}

export function usePartialWords() {
  return useListener((state) => state.partialWordsByChannel) as Record<number, PartialWord[]>;
}

export function useFinalWords(sessionId: string) {
  const store = persisted.UI.useStore(persisted.STORE_ID);

  const transcriptIds = persisted.UI.useSliceRowIds(
    persisted.INDEXES.transcriptBySession,
    sessionId,
    persisted.STORE_ID,
  );
  const transcriptId = transcriptIds?.[0];

  const wordIds = persisted.UI.useSliceRowIds(
    persisted.INDEXES.wordsByTranscript,
    transcriptId,
    persisted.STORE_ID,
  );

  return useMemo(() => {
    if (!store) {
      return {};
    }

    const words: Record<string, persisted.Word> = {};
    wordIds?.forEach((wordId) => {
      const word = store.getRow("words", wordId);
      if (word) {
        words[wordId] = word as persisted.Word;
      }
    });
    return words;
  }, [store, wordIds]);
}

export function useSegments(sessionId: string) {
  const finalWords = useFinalWords(sessionId);
  const partialWords = usePartialWords();

  return useMemo(
    () => buildSegments(finalWords, partialWords),
    [finalWords, partialWords],
  );
}
