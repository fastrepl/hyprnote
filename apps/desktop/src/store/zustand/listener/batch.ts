import type { StoreApi } from "zustand";

import type {
  BatchAlternatives,
  BatchResponse,
  StreamResponse,
} from "@hypr/plugin-listener";

import type { RuntimeSpeakerHint, WordLike } from "../../../utils/segment";
import type { HandlePersistCallback } from "./transcript";
import { fixSpacingForWords } from "./utils";

export type BatchState = {
  batch: Record<
    string,
    {
      percentage: number;
      isComplete?: boolean;
    }
  >;
};

export type BatchActions = {
  handleBatchStarted: (sessionId: string) => void;
  handleBatchResponse: (sessionId: string, response: BatchResponse) => void;
  handleBatchResponseStreamed: (
    sessionId: string,
    response: StreamResponse,
    percentage: number,
  ) => void;
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

  handleBatchStarted: (sessionId) => {
    set((state) => ({
      ...state,
      batch: {
        ...state.batch,
        [sessionId]: { percentage: 0, isComplete: false },
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
        [sessionId]: { percentage, isComplete: isComplete || false },
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
