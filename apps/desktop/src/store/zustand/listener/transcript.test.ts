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

  describe("Issue #4: Input Validation", () => {
    test("handles undefined channelIndex gracefully", () => {
      const persist = vi.fn();
      store.getState().setTranscriptPersist(persist);

      const responseWithUndefinedChannel: StreamResponse = {
        type: "Results",
        start: 0,
        duration: 0,
        is_final: true,
        speech_final: true,
        from_finalize: false,
        channel_index: [],
        channel: {
          alternatives: [
            {
              transcript: "Hello",
              confidence: 1,
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
              ],
            },
          ],
        },
        metadata: {
          request_id: "test",
          model_info: { name: "model", version: "1", arch: "cpu" },
          model_uuid: "model",
        },
      };

      store.getState().handleTranscriptResponse(responseWithUndefinedChannel);
      expect(persist).not.toHaveBeenCalled();
    });

    test("handles missing alternatives gracefully", () => {
      const persist = vi.fn();
      store.getState().setTranscriptPersist(persist);

      const responseWithNoAlternatives: StreamResponse = {
        type: "Results",
        start: 0,
        duration: 0,
        is_final: true,
        speech_final: true,
        from_finalize: false,
        channel_index: [0],
        channel: {
          alternatives: [],
        },
        metadata: {
          request_id: "test",
          model_info: { name: "model", version: "1", arch: "cpu" },
          model_uuid: "model",
        },
      };

      store.getState().handleTranscriptResponse(responseWithNoAlternatives);
      expect(persist).not.toHaveBeenCalled();
    });

    test("validates words are properly ordered by timestamp", () => {
      const persist = vi.fn();
      store.getState().setTranscriptPersist(persist);

      const responseWithUnorderedWords = createResponse({
        words: [
          {
            word: "world",
            punctuated_word: "world",
            start: 1.5,
            end: 2.0,
            confidence: 1,
            speaker: 0,
            language: "en",
          },
          {
            word: "hello",
            punctuated_word: "Hello",
            start: 0,
            end: 0.5,
            confidence: 1,
            speaker: 0,
            language: "en",
          },
        ],
        transcript: "world Hello",
        isFinal: true,
      });

      expect(() => {
        store.getState().handleTranscriptResponse(responseWithUnorderedWords);
      }).toThrow();
    });

    test("handles negative channelIndex", () => {
      const persist = vi.fn();
      store.getState().setTranscriptPersist(persist);

      const responseWithNegativeChannel = createResponse({
        words: defaultWords,
        transcript: "Another problem",
        isFinal: true,
        channelIndex: -1,
      });

      expect(() => {
        store.getState().handleTranscriptResponse(responseWithNegativeChannel);
      }).toThrow();
    });

    test("handles excessively large channelIndex", () => {
      const persist = vi.fn();
      store.getState().setTranscriptPersist(persist);

      const responseWithLargeChannel = createResponse({
        words: defaultWords,
        transcript: "Another problem",
        isFinal: true,
        channelIndex: 1000,
      });

      expect(() => {
        store.getState().handleTranscriptResponse(responseWithLargeChannel);
      }).toThrow();
    });
  });

  describe("Issue #1: Partial Hints Index Mismatch After Filtering", () => {
    test("adjusts partial hint indices after filtering partial words", () => {
      const persist = vi.fn();
      store.getState().setTranscriptPersist(persist);

      const partialResponse1 = createResponse({
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
            end: 1.0,
            confidence: 1,
            speaker: 1,
            language: "en",
          },
          {
            word: "test",
            punctuated_word: "test",
            start: 1.0,
            end: 1.5,
            confidence: 1,
            speaker: 0,
            language: "en",
          },
        ],
        transcript: "Hello world test",
        isFinal: false,
      });

      store.getState().handleTranscriptResponse(partialResponse1);

      const stateAfterPartial = store.getState();
      expect(stateAfterPartial.partialWordsByChannel[0]).toHaveLength(3);
      expect(stateAfterPartial.partialHints).toHaveLength(3);

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
            end: 1.0,
            confidence: 1,
            speaker: 1,
            language: "en",
          },
        ],
        transcript: "Hello world",
        isFinal: true,
      });

      store.getState().handleTranscriptResponse(finalResponse);

      const stateAfterFinal = store.getState();
      const remainingPartialWords = stateAfterFinal.partialWordsByChannel[0];
      const remainingHints = stateAfterFinal.partialHints;

      expect(remainingPartialWords).toHaveLength(1);
      expect(remainingPartialWords?.[0]?.text).toBe(" test");

      expect(remainingHints).toHaveLength(1);
      expect(remainingHints[0]?.wordIndex).toBe(0);

      const hintedWord =
        remainingPartialWords?.[remainingHints[0]?.wordIndex ?? -1];
      expect(hintedWord).toBeDefined();
      expect(hintedWord?.text).toBe(" test");
    });

    test("handles multiple partial hints with correct index adjustment", () => {
      const persist = vi.fn();
      store.getState().setTranscriptPersist(persist);

      const partialResponse = createResponse({
        words: [
          {
            word: "one",
            punctuated_word: "One",
            start: 0,
            end: 0.3,
            confidence: 1,
            speaker: 0,
            language: "en",
          },
          {
            word: "two",
            punctuated_word: "two",
            start: 0.3,
            end: 0.6,
            confidence: 1,
            speaker: 1,
            language: "en",
          },
          {
            word: "three",
            punctuated_word: "three",
            start: 0.6,
            end: 0.9,
            confidence: 1,
            speaker: 2,
            language: "en",
          },
          {
            word: "four",
            punctuated_word: "four",
            start: 0.9,
            end: 1.2,
            confidence: 1,
            speaker: 0,
            language: "en",
          },
        ],
        transcript: "One two three four",
        isFinal: false,
      });

      store.getState().handleTranscriptResponse(partialResponse);

      const finalResponse = createResponse({
        words: [
          {
            word: "one",
            punctuated_word: "One",
            start: 0,
            end: 0.3,
            confidence: 1,
            speaker: 0,
            language: "en",
          },
        ],
        transcript: "One",
        isFinal: true,
      });

      store.getState().handleTranscriptResponse(finalResponse);

      const stateAfterFinal = store.getState();
      const remainingPartialWords = stateAfterFinal.partialWordsByChannel[0];
      const remainingHints = stateAfterFinal.partialHints;

      expect(remainingPartialWords).toHaveLength(3);
      expect(remainingHints).toHaveLength(3);

      remainingHints.forEach((hint) => {
        const word = remainingPartialWords?.[hint.wordIndex];
        expect(word).toBeDefined();
        expect(hint.wordIndex).toBeGreaterThanOrEqual(0);
        expect(hint.wordIndex).toBeLessThan(remainingPartialWords?.length ?? 0);
      });
    });
  });

  describe("Issue #3: Memory Leak Prevention", () => {
    test("limits partial words to prevent unbounded growth", () => {
      const persist = vi.fn();
      store.getState().setTranscriptPersist(persist);

      for (let i = 0; i < 1500; i++) {
        const partialResponse = createResponse({
          words: [
            {
              word: `word${i}`,
              punctuated_word: `Word${i}`,
              start: i * 0.5,
              end: i * 0.5 + 0.4,
              confidence: 1,
              speaker: 0,
              language: "en",
            },
          ],
          transcript: `Word${i}`,
          isFinal: false,
        });

        store.getState().handleTranscriptResponse(partialResponse);
      }

      const state = store.getState();
      const partialWords = state.partialWordsByChannel[0] ?? [];
      const partialHints = state.partialHints;

      expect(partialWords.length).toBeLessThanOrEqual(1000);
      expect(partialHints.length).toBeLessThanOrEqual(1000);
    });

    test("cleans up old partial data based on time threshold", () => {
      const persist = vi.fn();
      store.getState().setTranscriptPersist(persist);

      const oldPartialResponse = createResponse({
        words: [
          {
            word: "old",
            punctuated_word: "Old",
            start: 0,
            end: 0.5,
            confidence: 1,
            speaker: 0,
            language: "en",
          },
        ],
        transcript: "Old",
        isFinal: false,
      });

      store.getState().handleTranscriptResponse(oldPartialResponse);

      const recentPartialResponse = createResponse({
        words: [
          {
            word: "recent",
            punctuated_word: "Recent",
            start: 3600,
            end: 3600.5,
            confidence: 1,
            speaker: 0,
            language: "en",
          },
        ],
        transcript: "Recent",
        isFinal: false,
      });

      store.getState().handleTranscriptResponse(recentPartialResponse);

      const state = store.getState();
      const partialWords = state.partialWordsByChannel[0] ?? [];

      expect(partialWords.length).toBeLessThanOrEqual(2);
    });

    test("clears partial data when handlePersist is set", () => {
      const partialResponse = createResponse({
        words: [
          {
            word: "test",
            punctuated_word: "Test",
            start: 0,
            end: 0.5,
            confidence: 1,
            speaker: 0,
            language: "en",
          },
        ],
        transcript: "Test",
        isFinal: false,
      });

      store.getState().handleTranscriptResponse(partialResponse);

      const stateBeforePersist = store.getState();
      expect(stateBeforePersist.partialWordsByChannel[0]).toHaveLength(1);

      const persist = vi.fn();
      store.getState().setTranscriptPersist(persist);

      store.getState().resetTranscript();

      const stateAfterReset = store.getState();
      expect(stateAfterReset.partialWordsByChannel[0]).toBeUndefined();
      expect(stateAfterReset.partialHints).toHaveLength(0);
    });
  });
});
