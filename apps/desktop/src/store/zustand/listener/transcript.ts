import { create as mutate } from "mutative";
import type { StoreApi } from "zustand";

import type { StreamResponse, Word } from "@hypr/plugin-listener";
import type { WordLike } from "../../../utils/segment";

type WordsByChannel = Record<number, WordLike[]>;

export type HandlePersistCallback = (words: WordLike[]) => void;

export type TranscriptState = {
  partialWordsByChannel: WordsByChannel;
  handlePersist?: HandlePersistCallback;
};

export type TranscriptActions = {
  setTranscriptPersist: (callback?: HandlePersistCallback) => void;
  handleTranscriptResponse: (response: StreamResponse) => void;
  resetTranscript: () => void;
};

const initialState: TranscriptState = {
  partialWordsByChannel: {},
  handlePersist: undefined,
};

export const createTranscriptSlice = <T extends TranscriptState & TranscriptActions>(
  set: StoreApi<T>["setState"],
  get: StoreApi<T>["getState"],
): TranscriptState & TranscriptActions => {
  const handleFinalWords = (
    channelIndex: number,
    words: WordLike[],
  ): void => {
    const { partialWordsByChannel, handlePersist } = get();

    const remaining = (partialWordsByChannel[channelIndex] ?? [])
      .filter((word) => word.start_ms > getLastEndMs(words));

    set((state) =>
      mutate(state, (draft) => {
        draft.partialWordsByChannel[channelIndex] = remaining;
      })
    );

    handlePersist?.(words);
  };

  const handlePartialWords = (
    channelIndex: number,
    words: WordLike[],
  ): void => {
    const { partialWordsByChannel } = get();
    const existing = partialWordsByChannel[channelIndex] ?? [];

    const [
      before,
      after,
    ] = [
      existing.filter((word) => word.end_ms <= getFirstStartMs(words)),
      existing.filter((word) => word.start_ms >= getLastEndMs(words)),
    ];

    set((state) =>
      mutate(state, (draft) => {
        draft.partialWordsByChannel[channelIndex] = [...before, ...words, ...after];
      })
    );
  };

  return {
    ...initialState,
    setTranscriptPersist: (callback) => {
      set((state) =>
        mutate(state, (draft) => {
          draft.handlePersist = callback;
        })
      );
    },
    handleTranscriptResponse: (response) => {
      if (response.type !== "Results") {
        return;
      }

      const channelIndex = response.channel_index[0];
      const alternative = response.channel.alternatives[0];
      if (channelIndex === undefined || !alternative) {
        return;
      }

      const words = transformWords(alternative.words ?? [], channelIndex);
      if (!words.length) {
        return;
      }

      if (response.is_final) {
        handleFinalWords(channelIndex, words);
      } else {
        handlePartialWords(channelIndex, words);
      }
    },
    resetTranscript: () => {
      const { partialWordsByChannel, handlePersist } = get();

      const remainingWords = Object.values(partialWordsByChannel).flat();
      if (remainingWords.length > 0) {
        handlePersist?.(remainingWords);
      }

      set((state) =>
        mutate(state, (draft) => {
          draft.partialWordsByChannel = {};
          draft.handlePersist = undefined;
        })
      );
    },
  };
};

const getLastEndMs = (words: WordLike[]): number => words[words.length - 1]?.end_ms ?? 0;
const getFirstStartMs = (words: WordLike[]): number => words[0]?.start_ms ?? 0;

function transformWords(
  rawWords: Word[],
  channelIndex: number,
): WordLike[] {
  const result: WordLike[] = [];

  for (const word of rawWords) {
    const text = word.word;

    result.push({
      text,
      start_ms: Math.round(word.start * 1000),
      end_ms: Math.round(word.end * 1000),
      channel: channelIndex,
    });
  }

  return result;
}
