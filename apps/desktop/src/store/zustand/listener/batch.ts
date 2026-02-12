import type { StoreApi } from "zustand";

import type { BatchResponse, StreamResponse } from "@hypr/plugin-listener2";

import {
  ChannelProfile,
  type RuntimeSpeakerHint,
  type WordLike,
} from "../../../utils/segment";
import type { HandlePersistCallback } from "./transcript";
import { transformWordEntries } from "./utils";

export type BatchPhase = "importing" | "transcribing";

export type BatchState = {
  batch: Record<
    string,
    {
      percentage: number;
      isComplete?: boolean;
      error?: string;
      phase?: BatchPhase;
    }
  >;
};

export type BatchActions = {
  handleBatchStarted: (sessionId: string, phase?: BatchPhase) => void;
  handleBatchResponse: (sessionId: string, response: BatchResponse) => void;
  handleBatchResponseStreamed: (
    sessionId: string,
    response: StreamResponse,
    percentage: number,
  ) => void;
  handleBatchFailed: (sessionId: string, error: string) => void;
  clearBatchSession: (sessionId: string) => void;
};

export const createBatchSlice = <
  T extends BatchState & {
    handlePersist?: HandlePersistCallback;
    handleTranscriptResponse?: (response: StreamResponse) => void;
  },
>(
  set: StoreApi<T>["setState"],
  get: StoreApi<T>["getState"],
): BatchState & BatchActions => ({
  batch: {},

  handleBatchStarted: (sessionId, phase) => {
    set((state) => ({
      ...state,
      batch: {
        ...state.batch,
        [sessionId]: {
          percentage: 0,
          isComplete: false,
          phase: phase ?? "transcribing",
        },
      },
    }));
  },

  handleBatchResponse: (sessionId, response) => {
    const { handlePersist } = get();

    const [words, hints] = transformBatch(response);
    if (!words.length) {
      return;
    }

    handlePersist?.(words, hints);

    set((state) => {
      if (!state.batch[sessionId]) {
        return state;
      }

      const { [sessionId]: _, ...rest } = state.batch;
      return {
        ...state,
        batch: rest,
      };
    });
  },

  handleBatchResponseStreamed: (sessionId, response, percentage) => {
    const { handleTranscriptResponse } = get();

    handleTranscriptResponse?.(response);

    const isComplete = response.type === "Results" && response.from_finalize;

    set((state) => ({
      ...state,
      batch: {
        ...state.batch,
        [sessionId]: {
          percentage,
          isComplete: isComplete || false,
          phase: "transcribing",
        },
      },
    }));
  },

  handleBatchFailed: (sessionId, error) => {
    set((state) => ({
      ...state,
      batch: {
        ...state.batch,
        [sessionId]: {
          ...(state.batch[sessionId] ?? { percentage: 0 }),
          error,
          isComplete: false,
        },
      },
    }));
  },

  clearBatchSession: (sessionId) => {
    set((state) => {
      if (!(sessionId in state.batch)) {
        return state;
      }

      const { [sessionId]: _, ...rest } = state.batch;
      return {
        ...state,
        batch: rest,
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

  response.results.channels.forEach((channel) => {
    const alternative = channel.alternatives[0];
    if (!alternative || !alternative.words || !alternative.words.length) {
      return;
    }

    const [words, hints] = transformWordEntries(
      alternative.words,
      alternative.transcript,
      ChannelProfile.MixedCapture,
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
