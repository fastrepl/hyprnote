import { describe, expect, test } from "vitest";
import type * as persisted from "../../../../../../store/tinybase/persisted";
import { mergeWordsByChannel } from "./viewer";

describe("mergeWordsByChannel", () => {
  describe("channel assignment", () => {
    test("assigns words to correct channels based on word.channel property", () => {
      const finalWords: Record<string, persisted.Word> = {
        "word-1": {
          text: "hello",
          start_ms: 0,
          end_ms: 100,
          channel: 0,
          user_id: "user-1",
          transcript_id: "transcript-1",
          created_at: "2024-01-01",
        },
        "word-2": {
          text: "world",
          start_ms: 200,
          end_ms: 300,
          channel: 0,
          user_id: "user-1",
          transcript_id: "transcript-1",
          created_at: "2024-01-01",
        },
      };

      const partialWords = {
        0: [
          { text: "testing", start_ms: 400, end_ms: 500, channel: 0 },
        ],
      };

      const result = mergeWordsByChannel(finalWords, partialWords);

      expect(result.size).toBe(1);
      expect(result.has(0)).toBe(true);
      expect(result.has(1)).toBe(false);
      expect(result.get(0)?.length).toBe(3);
    });

    test("uses word.channel property not partialWords object key", () => {
      const finalWords: Record<string, persisted.Word> = {};

      const partialWords = {
        1: [
          { text: "first", start_ms: 0, end_ms: 100, channel: 0 },
          { text: "second", start_ms: 200, end_ms: 300, channel: 0 },
        ],
      };

      const result = mergeWordsByChannel(finalWords, partialWords);

      expect(result.size).toBe(1);
      expect(result.has(0)).toBe(true);
      expect(result.has(1)).toBe(false);
      expect(result.get(0)?.length).toBe(2);
      expect(result.get(0)?.[0].channel).toBe(0);
      expect(result.get(0)?.[1].channel).toBe(0);
    });

    test("handles multiple channels correctly", () => {
      const finalWords: Record<string, persisted.Word> = {
        "word-1": {
          text: "channel0",
          start_ms: 0,
          end_ms: 100,
          channel: 0,
          user_id: "user-1",
          transcript_id: "transcript-1",
          created_at: "2024-01-01",
        },
        "word-2": {
          text: "channel1",
          start_ms: 0,
          end_ms: 100,
          channel: 1,
          user_id: "user-1",
          transcript_id: "transcript-1",
          created_at: "2024-01-01",
        },
      };

      const partialWords = {
        0: [{ text: "partial0", start_ms: 200, end_ms: 300, channel: 0 }],
        1: [{ text: "partial1", start_ms: 200, end_ms: 300, channel: 1 }],
      };

      const result = mergeWordsByChannel(finalWords, partialWords);

      expect(result.size).toBe(2);
      expect(result.get(0)?.length).toBe(2);
      expect(result.get(1)?.length).toBe(2);
    });
  });

  describe("word merging", () => {
    test("merges final and partial words for the same channel", () => {
      const finalWords: Record<string, persisted.Word> = {
        "word-1": {
          text: "final",
          start_ms: 0,
          end_ms: 100,
          channel: 0,
          user_id: "user-1",
          transcript_id: "transcript-1",
          created_at: "2024-01-01",
        },
      };

      const partialWords = {
        0: [{ text: "partial", start_ms: 200, end_ms: 300, channel: 0 }],
      };

      const result = mergeWordsByChannel(finalWords, partialWords);
      const channel0Words = result.get(0);

      expect(channel0Words?.length).toBe(2);
      expect(channel0Words?.[0].text).toBe("final");
      expect(channel0Words?.[0].isFinal).toBe(true);
      expect(channel0Words?.[1].text).toBe("partial");
      expect(channel0Words?.[1].isFinal).toBe(false);
    });

    test("sorts words by start_ms within each channel", () => {
      const finalWords: Record<string, persisted.Word> = {
        "word-1": {
          text: "third",
          start_ms: 600,
          end_ms: 700,
          channel: 0,
          user_id: "user-1",
          transcript_id: "transcript-1",
          created_at: "2024-01-01",
        },
        "word-2": {
          text: "first",
          start_ms: 0,
          end_ms: 100,
          channel: 0,
          user_id: "user-1",
          transcript_id: "transcript-1",
          created_at: "2024-01-01",
        },
      };

      const partialWords = {
        0: [
          { text: "fourth", start_ms: 800, end_ms: 900, channel: 0 },
          { text: "second", start_ms: 200, end_ms: 300, channel: 0 },
        ],
      };

      const result = mergeWordsByChannel(finalWords, partialWords);
      const channel0Words = result.get(0);

      expect(channel0Words?.length).toBe(4);
      expect(channel0Words?.[0].text).toBe("first");
      expect(channel0Words?.[0].start_ms).toBe(0);
      expect(channel0Words?.[1].text).toBe("second");
      expect(channel0Words?.[1].start_ms).toBe(200);
      expect(channel0Words?.[2].text).toBe("third");
      expect(channel0Words?.[2].start_ms).toBe(600);
      expect(channel0Words?.[3].text).toBe("fourth");
      expect(channel0Words?.[3].start_ms).toBe(800);
    });
  });

  describe("isFinal flag", () => {
    test("marks final words with isFinal=true", () => {
      const finalWords: Record<string, persisted.Word> = {
        "word-1": {
          text: "final",
          start_ms: 0,
          end_ms: 100,
          channel: 0,
          user_id: "user-1",
          transcript_id: "transcript-1",
          created_at: "2024-01-01",
        },
      };

      const partialWords = {};

      const result = mergeWordsByChannel(finalWords, partialWords);
      const channel0Words = result.get(0);

      expect(channel0Words?.[0].isFinal).toBe(true);
    });

    test("marks partial words with isFinal=false", () => {
      const finalWords: Record<string, persisted.Word> = {};

      const partialWords = {
        0: [{ text: "partial", start_ms: 0, end_ms: 100, channel: 0 }],
      };

      const result = mergeWordsByChannel(finalWords, partialWords);
      const channel0Words = result.get(0);

      expect(channel0Words?.[0].isFinal).toBe(false);
    });
  });

  describe("edge cases", () => {
    test("handles empty inputs", () => {
      const result = mergeWordsByChannel({}, {});
      expect(result.size).toBe(0);
    });

    test("handles only final words", () => {
      const finalWords: Record<string, persisted.Word> = {
        "word-1": {
          text: "only",
          start_ms: 0,
          end_ms: 100,
          channel: 0,
          user_id: "user-1",
          transcript_id: "transcript-1",
          created_at: "2024-01-01",
        },
      };

      const result = mergeWordsByChannel(finalWords, {});

      expect(result.size).toBe(1);
      expect(result.get(0)?.length).toBe(1);
      expect(result.get(0)?.[0].isFinal).toBe(true);
    });

    test("handles only partial words", () => {
      const partialWords = {
        0: [{ text: "only", start_ms: 0, end_ms: 100, channel: 0 }],
      };

      const result = mergeWordsByChannel({}, partialWords);

      expect(result.size).toBe(1);
      expect(result.get(0)?.length).toBe(1);
      expect(result.get(0)?.[0].isFinal).toBe(false);
    });

    test("handles partialWords with nested arrays", () => {
      const partialWords = {
        0: [
          { text: "word1", start_ms: 0, end_ms: 100, channel: 0 },
          { text: "word2", start_ms: 200, end_ms: 300, channel: 0 },
        ],
        1: [
          { text: "word3", start_ms: 0, end_ms: 100, channel: 1 },
        ],
      };

      const result = mergeWordsByChannel({}, partialWords);

      expect(result.size).toBe(2);
      expect(result.get(0)?.length).toBe(2);
      expect(result.get(1)?.length).toBe(1);
    });
  });

  describe("data structure preservation", () => {
    test("preserves all word properties", () => {
      const finalWords: Record<string, persisted.Word> = {
        "word-1": {
          text: "hello",
          start_ms: 100,
          end_ms: 200,
          channel: 0,
          user_id: "user-1",
          transcript_id: "transcript-1",
          created_at: "2024-01-01",
        },
      };

      const result = mergeWordsByChannel(finalWords, {});
      const word = result.get(0)?.[0];

      expect(word).toBeDefined();
      expect(word?.text).toBe("hello");
      expect(word?.start_ms).toBe(100);
      expect(word?.end_ms).toBe(200);
      expect(word?.channel).toBe(0);
      expect(word?.isFinal).toBe(true);
    });
  });
});
