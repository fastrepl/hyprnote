import { useMemo } from "react";

import { useListener } from "../../../../../../../contexts/listener";
import * as persisted from "../../../../../../../store/tinybase/persisted";

export type MaybePartialWord = Omit<
  persisted.Word & { isFinal: boolean },
  "transcript_id" | "user_id" | "created_at"
>;

export function mergeWordsByChannel(
  finalWords: Record<string, persisted.Word>,
  partialWords: Record<number, Array<{ text: string; start_ms: number; end_ms: number; channel: number }>>,
): Map<number, MaybePartialWord[]> {
  const channels = new Map<number, MaybePartialWord[]>();

  Object.values(finalWords).forEach((word) => {
    const channelWords = channels.get(word.channel) ?? [];
    channelWords.push({
      text: word.text,
      start_ms: word.start_ms,
      end_ms: word.end_ms,
      channel: word.channel,
      isFinal: true,
    });
    channels.set(word.channel, channelWords);
  });

  Object.values(partialWords).forEach((words) => {
    words.forEach((word) => {
      const channelWords = channels.get(word.channel) ?? [];
      channelWords.push({
        text: word.text,
        start_ms: word.start_ms,
        end_ms: word.end_ms,
        channel: word.channel,
        isFinal: false,
      });
      channels.set(word.channel, channelWords);
    });
  });

  channels.forEach((words, channel) => {
    channels.set(
      channel,
      words.sort((a, b) => a.start_ms - b.start_ms),
    );
  });

  return channels;
}

export function useMergedWordsByChannel(
  finalWords: Record<string, persisted.Word>,
  partialWords: Record<number, Array<{ text: string; start_ms: number; end_ms: number; channel: number }>>,
) {
  return useMemo(
    () => mergeWordsByChannel(finalWords, partialWords),
    [finalWords, partialWords],
  );
}

export function usePartialWords() {
  const result = useListener((state) => state.partialWordsByChannel);
  return result;
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
