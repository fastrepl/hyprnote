import type { StoreApi } from "zustand";

import type { BatchAlternatives, BatchResponse } from "@hypr/plugin-listener";
import type { RuntimeSpeakerHint, WordLike } from "../../../utils/segment";

import type { HandlePersistCallback } from "./transcript";
import { fixSpacingForWords } from "./transcript";

export type BatchProgress = {
  audioDuration: number;
  transcriptDuration: number;
};

export type BatchState = {
  batchProgressBySession: Record<string, BatchProgress | null>;
};

export type BatchActions = {
  handleBatchResponse: (sessionId: string, response: BatchResponse) => void;
  handleBatchProgress: (sessionId: string, progress: BatchProgress) => void;
  clearBatchSession: (sessionId: string) => void;
};

export const createBatchSlice = <T extends BatchState & { handlePersist?: HandlePersistCallback }>(
  set: StoreApi<T>["setState"],
  get: StoreApi<T>["getState"],
): BatchState & BatchActions => ({
  batchProgressBySession: {},

  handleBatchResponse: (sessionId, response) => {
    const { handlePersist } = get();

    const [words, hints] = transformBatch(response);
    if (!words.length) {
      return;
    }

    handlePersist?.(words, hints);

    set((state) => {
      if (!state.batchProgressBySession[sessionId]) {
        return state;
      }

      const { [sessionId]: _, ...rest } = state.batchProgressBySession;
      return {
        ...state,
        batchProgressBySession: rest,
      };
    });
  },

  handleBatchProgress: (sessionId, progress) => {
    set((state) => ({
      ...state,
      batchProgressBySession: {
        ...state.batchProgressBySession,
        [sessionId]: progress,
      },
    }));
  },

  clearBatchSession: (sessionId) => {
    set((state) => {
      if (!(sessionId in state.batchProgressBySession)) {
        return state;
      }

      const { [sessionId]: _, ...rest } = state.batchProgressBySession;
      return {
        ...state,
        batchProgressBySession: rest,
      };
    });
  },
});

function transformBatch(
  response: BatchResponse,
): [WordLike[], RuntimeSpeakerHint[]] {
  const allWords: WordLike[] = [];
  const allHints: RuntimeSpeakerHint[] = [];
  let wordOffset = 0;

  response.results.channels.forEach((channel, channelIndex) => {
    const alternative = channel.alternatives[0];
    if (!alternative || !alternative.words || !alternative.words.length) {
      return;
    }

    const [words, hints] = transformAlternativeWords(
      alternative.words,
      alternative.transcript,
      channelIndex,
    );

    hints.forEach((hint) => {
      allHints.push({
        ...hint,
        wordIndex: hint.wordIndex + wordOffset,
      });
    });
    allWords.push(...words);
    wordOffset += words.length;
  });

  return [allWords, allHints];
}

function transformAlternativeWords(
  wordEntries: BatchAlternatives["words"],
  transcript: string,
  channelIndex: number,
): [WordLike[], RuntimeSpeakerHint[]] {
  const words: WordLike[] = [];
  const hints: RuntimeSpeakerHint[] = [];

  const textsWithSpacing = fixSpacingForWords(
    (wordEntries ?? []).map((w) => w.punctuated_word ?? w.word),
    transcript,
  );

  for (let i = 0; i < (wordEntries ?? []).length; i++) {
    const word = (wordEntries ?? [])[i];
    const text = textsWithSpacing[i];

    words.push({
      text,
      start_ms: Math.round(word.start * 1000),
      end_ms: Math.round(word.end * 1000),
      channel: channelIndex,
    });

    if (typeof word.speaker === "number") {
      hints.push({
        wordIndex: i,
        data: {
          type: "provider_speaker_index",
          speaker_index: word.speaker,
        },
      });
    }
  }

  return [words, hints];
}
