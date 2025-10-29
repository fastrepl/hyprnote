import { useMemo } from "react";

import { useListener } from "../../../../../../../contexts/listener";
import * as main from "../../../../../../../store/tinybase/main";
import { buildSegments, mergeWordsByChannel, type PartialWord } from "../../../../../../../utils/segments";

export function useMergedWordsByChannel(
  finalWords: Record<string, main.Word>,
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
  const store = main.UI.useStore(main.STORE_ID);

  const transcriptIds = main.UI.useSliceRowIds(
    main.INDEXES.transcriptBySession,
    sessionId,
    main.STORE_ID,
  );
  const transcriptId = transcriptIds?.[0];

  const wordIds = main.UI.useSliceRowIds(
    main.INDEXES.wordsByTranscript,
    transcriptId,
    main.STORE_ID,
  );

  return useMemo(() => {
    if (!store) {
      return {};
    }

    const words: Record<string, main.Word> = {};
    wordIds?.forEach((wordId) => {
      const word = store.getRow("words", wordId);
      if (word) {
        words[wordId] = word as main.Word;
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
