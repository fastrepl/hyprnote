import type { StoreApi } from "zustand";

import type { BatchAlternatives, BatchResponse } from "@hypr/plugin-listener";
import type { RuntimeSpeakerHint, WordLike } from "../../../utils/segment";

import type { HandlePersistCallback } from "./transcript";
import { fixSpacingForWords } from "./transcript";

export type BatchState = {};

export type BatchActions = {
  handleBatchResponse: (response: BatchResponse) => void;
};

export const createBatchSlice = <T extends BatchState & { handlePersist?: HandlePersistCallback }>(
  _set: StoreApi<T>["setState"],
  get: StoreApi<T>["getState"],
): BatchState & BatchActions => ({
  handleBatchResponse: (response) => {
    const { handlePersist } = get();

    const [words, hints] = transformBatch(response);
    if (!words.length) {
      return;
    }

    handlePersist?.(words, hints);
  },
});

function transformBatch(
  response: BatchResponse,
): [WordLike[], RuntimeSpeakerHint[]] {
  const allWords: WordLike[] = [];
  const allHints: RuntimeSpeakerHint[] = [];

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

    allHints.push(...hints);
    allWords.push(...words);
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
