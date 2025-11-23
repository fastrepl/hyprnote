import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createStore } from "zustand";

import type { StreamResponse, StreamWord } from "@hypr/plugin-listener";

import type { RuntimeSpeakerHint, WordLike } from "../../../utils/segment";
import {
  createTranscriptSlice,
  type TranscriptActions,
  type TranscriptState,
} from "./transcript";

const createTranscriptStore = () => {
  return createStore<TranscriptState & TranscriptActions>((set, get) =>
    createTranscriptSlice(set, get),
  );
};

describe("transcript slice", () => {
  const defaultWords: StreamWord[] = [
    {
      word: "another",
      punctuated_word: "Another",
      start: 0,
      end: 1,
      confidence: 1,
      speaker: 0,
      language: "en",
    },
    {
      word: "problem",
      punctuated_word: "problem",
      start: 1,
      end: 2,
      confidence: 1,
      speaker: 1,
      language: "en",
    },
  ];

  const createResponse = ({
    words,
    transcript,
    isFinal,
    channelIndex = 0,
  }: {
    words: StreamWord[];
    transcript: string;
    isFinal: boolean;
    channelIndex?: number;
  }): StreamResponse => {
    return {
      type: "Results",
      start: 0,
      duration: 0,
      is_final: isFinal,
      speech_final: isFinal,
      from_finalize: false,
      channel_index: [channelIndex],
      channel: {
        alternatives: [
          {
            transcript,
            confidence: 1,
            words,
          },
        ],
      },
      metadata: {
        request_id: "test",
        model_info: { name: "model", version: "1", arch: "cpu" },
        model_uuid: "model",
      },
    } satisfies StreamResponse;
  };

  type TranscriptStore = ReturnType<typeof createTranscriptStore>;
  let store: TranscriptStore;

  beforeEach(() => {
    store = createTranscriptStore();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("stores partial words and hints from streaming updates", () => {
    const initialPartial = createResponse({
      words: defaultWords,
      transcript: "Another problem",
      isFinal: false,
    });

    store.getState().handleTranscriptResponse(initialPartial);

    const stateAfterFirst = store.getState();
    const firstChannelWords = stateAfterFirst.partialWordsByChannel[0];
    expect(firstChannelWords).toHaveLength(2);
    expect(firstChannelWords?.map((word) => word.text)).toEqual([
      " Another",
      " problem",
    ]);
    expect(stateAfterFirst.partialHints).toHaveLength(2);
    expect(stateAfterFirst.partialHints[0]?.wordIndex).toBe(0);
    expect(stateAfterFirst.partialHints[1]?.wordIndex).toBe(1);

    const extendedPartial = createResponse({
      words: [
        ...defaultWords,
        {
          word: "exists",
          punctuated_word: "exists",
          start: 2,
          end: 3,
          confidence: 1,
          speaker: 1,
          language: "en",
        },
      ],
      transcript: "Another problem exists",
      isFinal: false,
    });

    store.getState().handleTranscriptResponse(extendedPartial);

    const stateAfterSecond = store.getState();
    const updatedWords = stateAfterSecond.partialWordsByChannel[0];
    expect(updatedWords).toHaveLength(3);
    expect(updatedWords?.map((word) => word.text)).toEqual([
      " Another",
      " problem",
      " exists",
    ]);
    expect(stateAfterSecond.partialHints).toHaveLength(3);
    const lastPartialHint =
      stateAfterSecond.partialHints[stateAfterSecond.partialHints.length - 1];
    expect(lastPartialHint?.wordIndex).toBe(2);
  });

  test("persists only new final words", () => {
    const persist = vi.fn();
    store.getState().setTranscriptPersist(persist);

    const finalResponse = createResponse({
      words: [
        {
          word: "hello",
          punctuated_word: "Hello",
          start: 0,
          end: 0.5,
          confidence: 1,
          speaker: 0,
          language: "en",
        },
        {
          word: "world",
          punctuated_word: "world",
          start: 0.5,
          end: 1.5,
          confidence: 1,
          speaker: null,
          language: "en",
        },
      ],
      transcript: "Hello world",
      isFinal: true,
    });

    store.getState().handleTranscriptResponse(finalResponse);
    expect(persist).toHaveBeenCalledTimes(1);

    const [words, hints] = persist.mock.calls[0] as [
      WordLike[],
      RuntimeSpeakerHint[],
    ];
    expect(words.map((word) => word.text)).toEqual([" Hello", " world"]);
    expect(words.map((word) => word.end_ms)).toEqual([500, 1500]);
    expect(hints).toEqual([
      {
        data: { type: "provider_speaker_index", speaker_index: 0 },
        wordIndex: 0,
      },
    ]);

    store.getState().handleTranscriptResponse(finalResponse);
    expect(persist).toHaveBeenCalledTimes(1);
    expect(store.getState().finalWordsMaxEndMsByChannel[0]).toBe(1500);
  });

  test("auto discards partial words and hints after inactivity", () => {
    vi.useFakeTimers();

    const partial = createResponse({
      words: defaultWords,
      transcript: "Another problem",
      isFinal: false,
    });

    store.getState().handleTranscriptResponse(partial);

    const stateAfterFirst = store.getState();
    const firstChannelWords = stateAfterFirst.partialWordsByChannel[0];
    expect(firstChannelWords).toHaveLength(2);
    expect(firstChannelWords?.map((word) => word.text)).toEqual([
      " Another",
      " problem",
    ]);
    expect(stateAfterFirst.partialHints).toHaveLength(2);
    expect(stateAfterFirst.partialHints[0]?.wordIndex).toBe(0);
    expect(stateAfterFirst.partialHints[1]?.wordIndex).toBe(1);

    vi.advanceTimersByTime(1000);

    const extendedPartial = createResponse({
      words: [
        ...defaultWords,
        {
          word: "exists",
          punctuated_word: "exists",
          start: 2,
          end: 3,
          confidence: 1,
          speaker: 1,
          language: "en",
        },
      ],
      transcript: "Another problem exists",
      isFinal: false,
    });

    store.getState().handleTranscriptResponse(extendedPartial);

    vi.advanceTimersByTime(1000);

    expect(store.getState().partialWordsByChannel[0]).toHaveLength(3);
    expect(store.getState().partialHints).toHaveLength(3);

    vi.runAllTimers();

    const state = store.getState();
    expect(Object.values(state.partialWordsByChannel).flat()).toHaveLength(0);
    expect(state.partialHints).toHaveLength(0);
  });

  test("does not persist discarded partial words", () => {
    vi.useFakeTimers();

    const persist = vi.fn();
    store.getState().setTranscriptPersist(persist);

    const partial = createResponse({
      words: defaultWords,
      transcript: "Another problem",
      isFinal: false,
    });

    store.getState().handleTranscriptResponse(partial);

    vi.runAllTimers();

    expect(persist).not.toHaveBeenCalled();

    const state = store.getState();
    expect(Object.values(state.partialWordsByChannel).flat()).toHaveLength(0);
    expect(state.partialHints).toHaveLength(0);
  });
});
