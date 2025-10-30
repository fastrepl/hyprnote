import { create as mutate } from "mutative";
import type { StoreApi } from "zustand";

import type { StreamResponse, Word } from "@hypr/plugin-listener";
import * as main from "../../tinybase/main";

type PartialWord = Pick<main.Word, "text" | "start_ms" | "end_ms" | "channel">;
type WordsByChannel = Record<number, PartialWord[]>;

export type PersistFinalCallback = (words: PartialWord[]) => void;

export type TranscriptState = {
  managerOffsetMs: number;
  partialWordsByChannel: WordsByChannel;
  persistFinal?: PersistFinalCallback;
};

export type TranscriptActions = {
  setTranscriptManagerOffset: (offsetMs: number) => void;
  setTranscriptPersist: (callback?: PersistFinalCallback) => void;
  handleTranscriptResponse: (response: StreamResponse) => void;
  resetTranscript: () => void;
};

const initialState: TranscriptState = {
  managerOffsetMs: 0,
  partialWordsByChannel: {},
  persistFinal: undefined,
};

const sanitizeWords = (
  rawWords: Word[],
  managerOffsetMs: number,
  channelIndex: number,
): PartialWord[] => {
  const trimmed = rawWords.reduce<PartialWord[]>((acc, word) => {
    const text = word.word.trim();
    if (!text) {
      return acc;
    }

    const start_ms = managerOffsetMs + Math.round(word.start * 1000);
    const end_ms = managerOffsetMs + Math.round(word.end * 1000);

    acc.push({
      text,
      start_ms,
      end_ms,
      channel: word.speaker ?? channelIndex,
    });

    return acc;
  }, []);

  if (!trimmed.length) {
    return trimmed;
  }

  const merged: PartialWord[] = [];

  for (const word of trimmed) {
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

  return merged;
};

export const createTranscriptSlice = <T extends TranscriptState & TranscriptActions>(
  set: StoreApi<T>["setState"],
  get: StoreApi<T>["getState"],
): TranscriptState & TranscriptActions => ({
  ...initialState,
  setTranscriptManagerOffset: (offsetMs) => {
    set((state) =>
      mutate(state, (draft) => {
        draft.managerOffsetMs = offsetMs;
      })
    );
  },
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

    const { managerOffsetMs, partialWordsByChannel, persistFinal } = get();

    const words = sanitizeWords(alternative.words ?? [], managerOffsetMs, channelIndex);

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
        draft.managerOffsetMs = 0;
        draft.partialWordsByChannel = {};
        draft.persistFinal = undefined;
      })
    );
  },
});
