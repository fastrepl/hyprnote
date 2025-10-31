import { create as mutate } from "mutative";
import type { StoreApi } from "zustand";

import type { StreamResponse, Word } from "@hypr/plugin-listener";
import * as main from "../../tinybase/main";

type PartialWord = Pick<main.Word, "text" | "start_ms" | "end_ms" | "channel">;
type WordsByChannel = Record<number, PartialWord[]>;

export type PersistFinalCallback = (words: PartialWord[]) => void;

export type TranscriptState = {
  partialWordsByChannel: WordsByChannel;
  persistFinal?: PersistFinalCallback;
};

export type TranscriptActions = {
  setTranscriptPersist: (callback?: PersistFinalCallback) => void;
  handleTranscriptResponse: (response: StreamResponse) => void;
  resetTranscript: () => void;
};

const initialState: TranscriptState = {
  partialWordsByChannel: {},
  persistFinal: undefined,
};

const sanitizeWords = (
  rawWords: Word[],
  channelIndex: number,
): { words: PartialWord[] } => {
  const trimmed = rawWords.reduce<PartialWord[]>((acc, word) => {
    const text = word.word.trim();
    if (!text) {
      return acc;
    }

    const start_ms = Math.round(word.start * 1000);
    const end_ms = Math.round(word.end * 1000);

    acc.push({
      text,
      start_ms,
      end_ms,
      channel: channelIndex,
    });

    return acc;
  }, []);

  if (!trimmed.length) {
    return { words: trimmed };
  }

  const merged: PartialWord[] = [];

  for (let i = 0; i < trimmed.length; i++) {
    const word = trimmed[i];
    if (merged.length > 0 && word.text.startsWith("'")) {
      const previous = merged[merged.length - 1];
      merged[merged.length - 1] = {
        ...previous,
        text: `${previous.text}${word.text}`,
        end_ms: word.end_ms,
      };
      continue;
    }

    merged.push(word);
  }

  return { words: merged };
};

export const createTranscriptSlice = <T extends TranscriptState & TranscriptActions>(
  set: StoreApi<T>["setState"],
  get: StoreApi<T>["getState"],
): TranscriptState & TranscriptActions => ({
  ...initialState,
  setTranscriptPersist: (callback) => {
    set((state) =>
      mutate(state, (draft) => {
        draft.persistFinal = callback;
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

    const { partialWordsByChannel, persistFinal } = get();

    const { words } = sanitizeWords(alternative.words ?? [], channelIndex);

    if (!words.length) {
      return;
    }

    if (response.is_final) {
      const lastEndMs = words[words.length - 1]?.end_ms ?? 0;
      const remaining = (partialWordsByChannel[channelIndex] ?? []).filter(
        (word) => word.start_ms > lastEndMs,
      );

      set((state) =>
        mutate(state, (draft) => {
          draft.partialWordsByChannel[channelIndex] = remaining;
        })
      );

      persistFinal?.(words);
      return;
    }

    const existing = partialWordsByChannel[channelIndex] ?? [];
    const firstStartMs = words[0]?.start_ms ?? 0;
    const lastEndMs = words[words.length - 1]?.end_ms ?? 0;

    const before = existing.filter((word) => word.end_ms <= firstStartMs);
    const after = existing.filter((word) => word.start_ms >= lastEndMs);

    set((state) =>
      mutate(state, (draft) => {
        draft.partialWordsByChannel[channelIndex] = [...before, ...words, ...after];
      })
    );
  },
  resetTranscript: () => {
    set((state) =>
      mutate(state, (draft) => {
        draft.partialWordsByChannel = {};
        draft.persistFinal = undefined;
      })
    );
  },
});
