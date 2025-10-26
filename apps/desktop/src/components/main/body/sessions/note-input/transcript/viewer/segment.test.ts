import { describe, expect, test } from "vitest";
import { word } from "./test-utils";
import "./test-utils";

import { mergeWordsByChannel } from "./segment";

describe("mergeWordsByChannel", () => {
  describe("channel assignment", () => {
    test("assigns words to correct channels based on word.channel property", () => {
      const finalWords = {
        "word-1": word("hello", 0, 100, 0),
        "word-2": word("world", 200, 300, 0),
      };

      const partialWords = {
        0: [{ text: "testing", start_ms: 400, end_ms: 500, channel: 0 }],
      };

      const result = mergeWordsByChannel(finalWords, partialWords);

      expect(result).toHaveChannels(0);
      expect(result).toHaveWordsInChannel(0, 3);
    });

    test("uses word.channel property not partialWords object key", () => {
      const partialWords = {
        1: [
          { text: "first", start_ms: 0, end_ms: 100, channel: 0 },
          { text: "second", start_ms: 200, end_ms: 300, channel: 0 },
        ],
      };

      const result = mergeWordsByChannel({}, partialWords);

      expect(result).toHaveChannels(0);
      expect(result).toHaveWordsInChannel(0, 2);
      expect(result.get(0)?.[0].channel).toBe(0);
      expect(result.get(0)?.[1].channel).toBe(0);
    });

    test("handles multiple channels correctly", () => {
      const finalWords = {
        "word-1": word("channel0", 0, 100, 0),
        "word-2": word("channel1", 0, 100, 1),
      };

      const partialWords = {
        0: [{ text: "partial0", start_ms: 200, end_ms: 300, channel: 0 }],
        1: [{ text: "partial1", start_ms: 200, end_ms: 300, channel: 1 }],
      };

      const result = mergeWordsByChannel(finalWords, partialWords);

      expect(result).toHaveChannels(0, 1);
      expect(result).toHaveWordsInChannel(0, 2);
      expect(result).toHaveWordsInChannel(1, 2);
    });
  });

  describe("word merging", () => {
    test("merges final and partial words for the same channel", () => {
      const finalWords = {
        "word-1": word("final", 0, 100, 0),
      };

      const partialWords = {
        0: [{ text: "partial", start_ms: 200, end_ms: 300, channel: 0 }],
      };

      const result = mergeWordsByChannel(finalWords, partialWords);

      expect(result).toHaveWordsInChannel(0, 2);
      expect(result.get(0)?.[0].text).toBe("final");
      expect(result.get(0)?.[0].isFinal).toBe(true);
      expect(result.get(0)?.[1].text).toBe("partial");
      expect(result.get(0)?.[1].isFinal).toBe(false);
    });

    test("sorts words by start_ms within each channel", () => {
      const finalWords = {
        "word-1": word("third", 600, 700, 0),
        "word-2": word("first", 0, 100, 0),
      };

      const partialWords = {
        0: [
          { text: "fourth", start_ms: 800, end_ms: 900, channel: 0 },
          { text: "second", start_ms: 200, end_ms: 300, channel: 0 },
        ],
      };

      const result = mergeWordsByChannel(finalWords, partialWords);

      expect(result).toHaveWordsInOrder(0, ["first", "second", "third", "fourth"]);
      expect(result.get(0)?.[0].start_ms).toBe(0);
      expect(result.get(0)?.[1].start_ms).toBe(200);
      expect(result.get(0)?.[2].start_ms).toBe(600);
      expect(result.get(0)?.[3].start_ms).toBe(800);
    });
  });

  describe("isFinal flag", () => {
    test("marks final words with isFinal=true", () => {
      const finalWords = {
        "word-1": word("final", 0, 100, 0),
      };

      const result = mergeWordsByChannel(finalWords, {});

      expect(result.get(0)?.[0].isFinal).toBe(true);
    });

    test("marks partial words with isFinal=false", () => {
      const partialWords = {
        0: [{ text: "partial", start_ms: 0, end_ms: 100, channel: 0 }],
      };

      const result = mergeWordsByChannel({}, partialWords);

      expect(result.get(0)?.[0].isFinal).toBe(false);
    });
  });

  describe("edge cases", () => {
    test("handles empty inputs", () => {
      const result = mergeWordsByChannel({}, {});

      expect(result.size).toBe(0);
    });

    test("handles only final words", () => {
      const finalWords = {
        "word-1": word("only", 0, 100, 0),
      };

      const result = mergeWordsByChannel(finalWords, {});

      expect(result).toHaveWordsInChannel(0, 1);
      expect(result.get(0)?.[0].isFinal).toBe(true);
    });

    test("handles only partial words", () => {
      const partialWords = {
        0: [{ text: "only", start_ms: 0, end_ms: 100, channel: 0 }],
      };

      const result = mergeWordsByChannel({}, partialWords);

      expect(result).toHaveWordsInChannel(0, 1);
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

      expect(result).toHaveChannels(0, 1);
      expect(result).toHaveWordsInChannel(0, 2);
      expect(result).toHaveWordsInChannel(1, 1);
    });
  });

  describe("data structure preservation", () => {
    test("preserves all word properties", () => {
      const finalWords = {
        "word-1": word("hello", 100, 200, 0),
      };

      const result = mergeWordsByChannel(finalWords, {});
      const resultWord = result.get(0)?.[0];

      expect(resultWord).toBeDefined();
      expect(resultWord?.text).toBe("hello");
      expect(resultWord?.start_ms).toBe(100);
      expect(resultWord?.end_ms).toBe(200);
      expect(resultWord?.channel).toBe(0);
      expect(resultWord?.isFinal).toBe(true);
    });
  });
});
