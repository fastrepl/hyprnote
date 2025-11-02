import { create as mutate } from "mutative";
import type { StoreApi } from "zustand";

import type { Alternatives, StreamResponse } from "@hypr/plugin-listener";
import type { SpeakerHint, WordLike } from "../../../utils/segment";

type WordsByChannel = Record<number, WordLike[]>;

export type HandlePersistCallback = (words: WordLike[], hints: SpeakerHint[]) => void;

export type TranscriptState = {
  partialWordsByChannel: WordsByChannel;
  partialHints: SpeakerHint[];
  handlePersist?: HandlePersistCallback;
};

export type TranscriptActions = {
  setTranscriptPersist: (callback?: HandlePersistCallback) => void;
  handleTranscriptResponse: (response: StreamResponse) => void;
  resetTranscript: () => void;
};

const initialState: TranscriptState = {
  partialWordsByChannel: {},
  partialHints: [],
  handlePersist: undefined,
};

export const createTranscriptSlice = <T extends TranscriptState & TranscriptActions>(
  set: StoreApi<T>["setState"],
  get: StoreApi<T>["getState"],
): TranscriptState & TranscriptActions => {
  const handleFinalWords = (
    channelIndex: number,
    words: WordLike[],
    hints: SpeakerHint[],
  ): void => {
    const { partialWordsByChannel, partialHints, handlePersist } = get();

    const lastEndMs = getLastEndMs(words);
    const remaining = (partialWordsByChannel[channelIndex] ?? [])
      .filter((word) => word.start_ms > lastEndMs);

    const remainingHints = partialHints.filter((hint) => {
      const partialWords = partialWordsByChannel[channelIndex] ?? [];
      const word = partialWords[hint.wordIndex];
      return word && word.start_ms > lastEndMs;
    });

    set((state) =>
      mutate(state, (draft) => {
        draft.partialWordsByChannel[channelIndex] = remaining;
        draft.partialHints = remainingHints;
      })
    );

    handlePersist?.(words, hints);
  };

  const handlePartialWords = (
    channelIndex: number,
    words: WordLike[],
    hints: SpeakerHint[],
  ): void => {
    const { partialWordsByChannel, partialHints } = get();
    const existing = partialWordsByChannel[channelIndex] ?? [];

    const firstStartMs = getFirstStartMs(words);
    const lastEndMs = getLastEndMs(words);

    const [
      before,
      after,
    ] = [
      existing.filter((word) => word.end_ms <= firstStartMs),
      existing.filter((word) => word.start_ms >= lastEndMs),
    ];

    const newWords = [...before, ...words, ...after];

    const hintsWithAdjustedIndices = hints.map((hint) => ({
      ...hint,
      wordIndex: before.length + hint.wordIndex,
    }));

    const filteredOldHints = partialHints.filter((hint) => {
      const word = existing[hint.wordIndex];
      return word && (word.end_ms <= firstStartMs || word.start_ms >= lastEndMs);
    });

    set((state) =>
      mutate(state, (draft) => {
        draft.partialWordsByChannel[channelIndex] = newWords;
        draft.partialHints = [...filteredOldHints, ...hintsWithAdjustedIndices];
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

      const [words, hints] = transformWords(alternative, channelIndex);
      if (!words.length) {
        return;
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
          draft.handlePersist = undefined;
        })
      );
    },
  };
};

const getLastEndMs = (words: WordLike[]): number => words[words.length - 1]?.end_ms ?? 0;
const getFirstStartMs = (words: WordLike[]): number => words[0]?.start_ms ?? 0;

function transformWords(
  alternative: Alternatives,
  channelIndex: number,
): [WordLike[], SpeakerHint[]] {
  const words: WordLike[] = [];
  const hints: SpeakerHint[] = [];

  const textsWithSpacing = fixSpacingForWords(
    (alternative.words ?? []).map((w) => w.punctuated_word ?? w.word),
    alternative.transcript,
  );

  for (let i = 0; i < alternative.words.length; i++) {
    const word = alternative.words?.[i];
    if (!word) {
      continue;
    }

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
        speakerIndex: word.speaker,
      });
    }
  }

  return [words, hints];
}

export function fixSpacingForWords(words: string[], transcript: string): string[] {
  const result: string[] = [];
  let pos = 0;

  for (const [i, word] of words.entries()) {
    const trimmed = word.trim();

    if (!trimmed) {
      result.push(word);
      continue;
    }

    const foundAt = transcript.indexOf(trimmed, pos);
    if (foundAt === -1) {
      result.push(word);
      continue;
    }

    const prefix = i === 0 ? " " : transcript.slice(pos, foundAt);
    result.push(prefix + trimmed);
    pos = foundAt + trimmed.length;
  }

  return result;
}
