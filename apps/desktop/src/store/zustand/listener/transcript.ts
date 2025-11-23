import { create as mutate } from "mutative";
import type { StoreApi } from "zustand";

import type { StreamAlternatives, StreamResponse } from "@hypr/plugin-listener";

import type { RuntimeSpeakerHint, WordLike } from "../../../utils/segment";
import { fixSpacingForWords } from "./utils";

type WordsByChannel = Record<number, WordLike[]>;

export type HandlePersistCallback = (
  words: WordLike[],
  hints: RuntimeSpeakerHint[],
) => void;

export type TranscriptState = {
  finalWordsMaxEndMsByChannel: Record<number, number>;
  partialWordsByChannel: WordsByChannel;
  partialHints: RuntimeSpeakerHint[];
  handlePersist?: HandlePersistCallback;
};

export type TranscriptActions = {
  setTranscriptPersist: (callback?: HandlePersistCallback) => void;
  handleTranscriptResponse: (response: StreamResponse) => void;
  resetTranscript: () => void;
};

const initialState: TranscriptState = {
  finalWordsMaxEndMsByChannel: {},
  partialWordsByChannel: {},
  partialHints: [],
  handlePersist: undefined,
};

export const createTranscriptSlice = <
  T extends TranscriptState & TranscriptActions,
>(
  set: StoreApi<T>["setState"],
  get: StoreApi<T>["getState"],
): TranscriptState & TranscriptActions => {
  const handleFinalWords = (
    channelIndex: number,
    words: WordLike[],
    hints: RuntimeSpeakerHint[],
  ): void => {
    const {
      partialWordsByChannel,
      partialHints,
      handlePersist,
      finalWordsMaxEndMsByChannel,
    } = get();

    const lastPersistedEndMs = finalWordsMaxEndMsByChannel[channelIndex] ?? 0;
    const lastEndMs = getLastEndMs(words);

    const firstNewWordIndex = words.findIndex(
      (word) => word.end_ms > lastPersistedEndMs,
    );
    if (firstNewWordIndex === -1) {
      return;
    }

    const newWords = words.slice(firstNewWordIndex);
    const newHints = hints
      .filter((hint) => hint.wordIndex >= firstNewWordIndex)
      .map((hint) => ({
        ...hint,
        wordIndex: hint.wordIndex - firstNewWordIndex,
      }));

    const partialWords = partialWordsByChannel[channelIndex] ?? [];
    const oldIndexToNewIndex = new Map<number, number>();
    const remainingPartialWords: WordLike[] = [];

    partialWords.forEach((word, oldIndex) => {
      if (word.start_ms >= lastEndMs) {
        oldIndexToNewIndex.set(oldIndex, remainingPartialWords.length);
        remainingPartialWords.push(word);
      }
    });

    const remainingPartialHints = partialHints
      .filter((hint) => {
        const word = partialWords[hint.wordIndex];
        return word && word.start_ms >= lastEndMs;
      })
      .map((hint) => ({
        ...hint,
        wordIndex: oldIndexToNewIndex.get(hint.wordIndex) ?? hint.wordIndex,
      }));

    set((state) =>
      mutate(state, (draft) => {
        draft.partialWordsByChannel[channelIndex] = remainingPartialWords;
        draft.partialHints = remainingPartialHints;
        draft.finalWordsMaxEndMsByChannel[channelIndex] = lastEndMs;
      }),
    );

    handlePersist?.(newWords, newHints);
  };

  const handlePartialWords = (
    channelIndex: number,
    words: WordLike[],
    hints: RuntimeSpeakerHint[],
  ): void => {
    const { partialWordsByChannel, partialHints } = get();
    const existing = partialWordsByChannel[channelIndex] ?? [];

    const firstStartMs = getFirstStartMs(words);
    const lastEndMs = getLastEndMs(words);

    const [before, after] = [
      existing.filter((word) => word.end_ms <= firstStartMs),
      existing.filter((word) => word.start_ms >= lastEndMs),
    ];

    let newWords = [...before, ...words, ...after];

    const hintsWithAdjustedIndices = hints.map((hint) => ({
      ...hint,
      wordIndex: before.length + hint.wordIndex,
    }));

    const filteredOldHints = partialHints.filter((hint) => {
      const word = existing[hint.wordIndex];
      return (
        word && (word.end_ms <= firstStartMs || word.start_ms >= lastEndMs)
      );
    });

    let newHints = [...filteredOldHints, ...hintsWithAdjustedIndices];

    const MAX_PARTIAL_WORDS = 1000;
    const MAX_PARTIAL_HINTS = 1000;

    if (newWords.length > MAX_PARTIAL_WORDS) {
      const excessWords = newWords.length - MAX_PARTIAL_WORDS;
      newWords = newWords.slice(excessWords);

      newHints = newHints
        .map((hint) => ({
          ...hint,
          wordIndex: hint.wordIndex - excessWords,
        }))
        .filter((hint) => hint.wordIndex >= 0);
    }

    if (newHints.length > MAX_PARTIAL_HINTS) {
      newHints = newHints.slice(-MAX_PARTIAL_HINTS);
    }

    set((state) =>
      mutate(state, (draft) => {
        draft.partialWordsByChannel[channelIndex] = newWords;
        draft.partialHints = newHints;
      }),
    );
  };

  return {
    ...initialState,
    setTranscriptPersist: (callback) => {
      set((state) =>
        mutate(state, (draft) => {
          draft.handlePersist = callback;
        }),
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

      if (channelIndex < 0 || channelIndex > 255) {
        throw new Error(
          `Invalid channelIndex: ${channelIndex}. Must be between 0 and 255.`,
        );
      }

      const [words, hints] = transformWords(alternative, channelIndex);
      if (!words.length) {
        return;
      }

      for (let i = 1; i < words.length; i++) {
        if (words[i].start_ms < words[i - 1].start_ms) {
          throw new Error(
            `Words are not properly ordered by timestamp. Word at index ${i} starts at ${words[i].start_ms}ms but previous word starts at ${words[i - 1].start_ms}ms.`,
          );
        }
      }

      if (response.is_final) {
        handleFinalWords(channelIndex, words, hints);
      } else {
        handlePartialWords(channelIndex, words, hints);
      }
    },
    resetTranscript: () => {
      const { partialWordsByChannel, partialHints, handlePersist } = get();

      const remainingWords = Object.values(partialWordsByChannel).flat();
      if (remainingWords.length > 0) {
        handlePersist?.(remainingWords, partialHints);
      }

      set((state) =>
        mutate(state, (draft) => {
          draft.partialWordsByChannel = {};
          draft.partialHints = [];
          draft.finalWordsMaxEndMsByChannel = {};
          draft.handlePersist = undefined;
        }),
      );
    },
  };
};

const getLastEndMs = (words: WordLike[]): number =>
  words[words.length - 1]?.end_ms ?? 0;
const getFirstStartMs = (words: WordLike[]): number => words[0]?.start_ms ?? 0;

function transformWords(
  alternative: StreamAlternatives,
  channelIndex: number,
): [WordLike[], RuntimeSpeakerHint[]] {
  const words: WordLike[] = [];
  const hints: RuntimeSpeakerHint[] = [];

  const textsWithSpacing = fixSpacingForWords(
    alternative.words.map((w) => w.punctuated_word ?? w.word),
    alternative.transcript,
  );

  for (let i = 0; i < alternative.words.length; i++) {
    const word = alternative.words[i];
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
