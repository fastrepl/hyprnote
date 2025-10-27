import { describe, expect, test } from "vitest";
import { word } from "./test-utils";
import "./test-utils";

import { buildSegments, groupIntoTurns, mergeWordsByChannel, splitIntoSegments } from "./segment";

describe("buildSegments", () => {
  test("merges partial and final words and groups by channel turns", () => {
    const finalWords = {
      "word-1": word("hello", 0, 100, 0),
      "word-2": word("world", 150, 200, 0),
      "word-3": word("respond", 250, 300, 1),
    };

    const partialWords = {
      1: [
        { text: "back", start_ms: 310, end_ms: 360, channel: 1 },
      ],
    };

    const segments = buildSegments(finalWords, partialWords);

    expect(segments).toHaveLength(2);
    expect(segments[0].channel).toBe(0);
    expect(segments[0].words.map((w) => w.text)).toEqual(["hello", "world"]);
    expect(segments[1].channel).toBe(1);
    expect(segments[1].words.map((w) => w.text)).toEqual(["respond", "back"]);
  });

  test("sorts mixed channels by time and preserves isFinal flag", () => {
    const finalWords = {
      "word-1": word("first", 0, 50, 0),
    };

    const partialWords = {
      0: [
        { text: "second", start_ms: 60, end_ms: 120, channel: 0 },
      ],
      1: [
        { text: "other", start_ms: 55, end_ms: 90, channel: 1 },
      ],
    };

    const segments = buildSegments(finalWords, partialWords);

    expect(segments).toHaveLength(3);
    expect(segments[0].channel).toBe(0);
    expect(segments[0].words[0].isFinal).toBe(true);
    expect(segments[1].channel).toBe(1);
    expect(segments[1].words[0].isFinal).toBe(false);
    expect(segments[2].channel).toBe(0);
    expect(segments[2].words[0].isFinal).toBe(false);
  });
});

describe("mergeWordsByChannel", () => {
  describe("channel assignment and merging", () => {
    test("uses word.channel property, not partialWords object key", () => {
      const partialWords = {
        1: [
          { text: "first", start_ms: 0, end_ms: 100, channel: 0 },
          { text: "second", start_ms: 200, end_ms: 300, channel: 0 },
        ],
      };

      const result = mergeWordsByChannel({}, partialWords);

      expect(result).toHaveChannels(0);
      expect(result).toHaveWordsInChannel(0, 2);
    });

    test("handles multiple channels with final and partial words", () => {
      const finalWords = {
        "word-1": word("final0", 0, 100, 0),
        "word-2": word("final1", 0, 100, 1),
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

    test("sorts words by start_ms and marks final/partial correctly", () => {
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
      expect(result.get(0)?.[0].isFinal).toBe(true);
      expect(result.get(0)?.[1].isFinal).toBe(false);
    });
  });

  describe("edge cases", () => {
    test("handles empty inputs", () => {
      const result = mergeWordsByChannel({}, {});
      expect(result.size).toBe(0);
    });

    test("handles only final words", () => {
      const finalWords = { "word-1": word("only", 0, 100, 0) };
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

    test("handles multiple partialWords arrays", () => {
      const partialWords = {
        0: [
          { text: "word1", start_ms: 0, end_ms: 100, channel: 0 },
          { text: "word2", start_ms: 200, end_ms: 300, channel: 0 },
        ],
        1: [{ text: "word3", start_ms: 0, end_ms: 100, channel: 1 }],
      };

      const result = mergeWordsByChannel({}, partialWords);

      expect(result).toHaveChannels(0, 1);
      expect(result).toHaveWordsInChannel(0, 2);
      expect(result).toHaveWordsInChannel(1, 1);
    });
  });
});

describe("groupIntoTurns", () => {
  describe("basic grouping", () => {
    test("groups words into chronological turns", () => {
      const wordsByChannel = new Map([
        [0, [
          { text: "first", start_ms: 0, end_ms: 100, channel: 0, isFinal: true },
          { text: "word", start_ms: 100, end_ms: 200, channel: 0, isFinal: true },
          { text: "third", start_ms: 400, end_ms: 500, channel: 0, isFinal: true },
        ]],
        [1, [
          { text: "second", start_ms: 200, end_ms: 300, channel: 1, isFinal: true },
        ]],
      ]);

      const turns = groupIntoTurns(wordsByChannel);

      expect(turns).toHaveLength(3);
      expect(turns[0].channel).toBe(0);
      expect(turns[0].words).toHaveLength(2);
      expect(turns[0].words[0].text).toBe("first");
      expect(turns[0].words[1].text).toBe("word");
      expect(turns[1].channel).toBe(1);
      expect(turns[1].words).toHaveLength(1);
      expect(turns[1].words[0].text).toBe("second");
      expect(turns[2].channel).toBe(0);
      expect(turns[2].words).toHaveLength(1);
      expect(turns[2].words[0].text).toBe("third");
    });

    test("handles alternating channels", () => {
      const wordsByChannel = new Map([
        [0, [
          { text: "hello", start_ms: 0, end_ms: 100, channel: 0, isFinal: true },
          { text: "how", start_ms: 300, end_ms: 400, channel: 0, isFinal: true },
        ]],
        [1, [
          { text: "hi", start_ms: 100, end_ms: 200, channel: 1, isFinal: true },
          { text: "good", start_ms: 400, end_ms: 500, channel: 1, isFinal: true },
        ]],
      ]);

      const turns = groupIntoTurns(wordsByChannel);

      expect(turns).toHaveLength(4);
      expect(turns[0].channel).toBe(0);
      expect(turns[1].channel).toBe(1);
      expect(turns[2].channel).toBe(0);
      expect(turns[3].channel).toBe(1);
    });

    test("merges consecutive words from same channel", () => {
      const wordsByChannel = new Map([
        [0, [
          { text: "one", start_ms: 0, end_ms: 100, channel: 0, isFinal: true },
          { text: "two", start_ms: 100, end_ms: 200, channel: 0, isFinal: true },
          { text: "three", start_ms: 200, end_ms: 300, channel: 0, isFinal: true },
        ]],
      ]);

      const turns = groupIntoTurns(wordsByChannel);

      expect(turns).toHaveLength(1);
      expect(turns[0].channel).toBe(0);
      expect(turns[0].words).toHaveLength(3);
    });
  });

  describe("edge cases", () => {
    test("handles empty map", () => {
      const turns = groupIntoTurns(new Map());
      expect(turns).toHaveLength(0);
    });

    test("handles single channel", () => {
      const wordsByChannel = new Map([
        [0, [
          { text: "only", start_ms: 0, end_ms: 100, channel: 0, isFinal: true },
        ]],
      ]);

      const turns = groupIntoTurns(wordsByChannel);

      expect(turns).toHaveLength(1);
      expect(turns[0].channel).toBe(0);
      expect(turns[0].words).toHaveLength(1);
    });

    test("preserves isFinal status", () => {
      const wordsByChannel = new Map([
        [0, [
          { text: "final", start_ms: 0, end_ms: 100, channel: 0, isFinal: true },
          { text: "partial", start_ms: 100, end_ms: 200, channel: 0, isFinal: false },
        ]],
      ]);

      const turns = groupIntoTurns(wordsByChannel);

      expect(turns[0].words[0].isFinal).toBe(true);
      expect(turns[0].words[1].isFinal).toBe(false);
    });
  });
});

describe("splitIntoSegments", () => {
  describe("basic splitting", () => {
    test("keeps short sequences in a single segment", () => {
      const words = [
        { text: "Hello", start_ms: 0, end_ms: 500, channel: 0, isFinal: true },
        { text: "world", start_ms: 600, end_ms: 1100, channel: 0, isFinal: true },
      ];

      const segments = splitIntoSegments(words);

      expect(segments).toHaveLength(1);
      expect(segments[0]).toHaveLength(2);
    });

    test("splits on large timestamp gaps (>2000ms)", () => {
      const words = [
        { text: "First", start_ms: 0, end_ms: 500, channel: 0, isFinal: true },
        { text: "sentence.", start_ms: 600, end_ms: 1100, channel: 0, isFinal: true },
        { text: "Second", start_ms: 4000, end_ms: 4500, channel: 0, isFinal: true },
        { text: "sentence.", start_ms: 4600, end_ms: 5100, channel: 0, isFinal: true },
      ];

      const segments = splitIntoSegments(words);

      expect(segments).toHaveLength(2);
      expect(segments[0]).toHaveLength(2);
      expect(segments[1]).toHaveLength(2);
    });
  });

  describe("sentence boundary detection", () => {
    test("prefers splitting at sentence boundaries", () => {
      const words = [
        { text: "First", start_ms: 0, end_ms: 500, channel: 0, isFinal: true },
        { text: "sentence.", start_ms: 600, end_ms: 1100, channel: 0, isFinal: true },
        { text: "Second", start_ms: 1200, end_ms: 1700, channel: 0, isFinal: true },
        { text: "sentence!", start_ms: 1800, end_ms: 2300, channel: 0, isFinal: true },
        { text: "Third", start_ms: 2400, end_ms: 2900, channel: 0, isFinal: true },
        { text: "one?", start_ms: 3000, end_ms: 3500, channel: 0, isFinal: true },
      ];

      const segments = splitIntoSegments(words, { maxWordsPerSegment: 4 });

      expect(segments).toHaveLength(2);
      expect(segments[0]).toHaveLength(4);
      expect(segments[0][3].text).toBe("sentence!");
      expect(segments[1]).toHaveLength(2);
    });

    test("recognizes period, exclamation, and question marks as sentence endings", () => {
      const words = [
        { text: "Period.", start_ms: 0, end_ms: 500, channel: 0, isFinal: true },
        { text: "Question?", start_ms: 1500, end_ms: 2000, channel: 0, isFinal: true },
        { text: "Exclamation!", start_ms: 3500, end_ms: 4000, channel: 0, isFinal: true },
      ];

      const segments = splitIntoSegments(words, { maxWordsPerSegment: 2 });

      expect(segments).toHaveLength(2);
    });
  });

  describe("segment size limits", () => {
    test("splits segments that exceed maxWordsPerSegment", () => {
      const words = Array.from({ length: 50 }, (_, i) => ({
        text: `word${i}`,
        start_ms: i * 100,
        end_ms: i * 100 + 50,
        channel: 0,
        isFinal: true,
      }));

      const segments = splitIntoSegments(words, { maxWordsPerSegment: 20 });

      expect(segments.length).toBeGreaterThan(2);
      segments.forEach((segment) => {
        expect(segment.length).toBeLessThanOrEqual(20);
      });
    });

    test("respects custom maxWordsPerSegment", () => {
      const words = Array.from({ length: 30 }, (_, i) => ({
        text: `word${i}`,
        start_ms: i * 100,
        end_ms: i * 100 + 50,
        channel: 0,
        isFinal: true,
      }));

      const segments = splitIntoSegments(words, { maxWordsPerSegment: 10 });

      expect(segments).toHaveLength(3);
      segments.forEach((segment) => {
        expect(segment.length).toBeLessThanOrEqual(10);
      });
    });
  });

  describe("scoring and optimization", () => {
    test("prefers sentence boundaries over mid-sentence splits when both exceed limit", () => {
      const words = [
        { text: "This", start_ms: 0, end_ms: 100, channel: 0, isFinal: true },
        { text: "is", start_ms: 150, end_ms: 250, channel: 0, isFinal: true },
        { text: "sentence", start_ms: 300, end_ms: 500, channel: 0, isFinal: true },
        { text: "one.", start_ms: 550, end_ms: 750, channel: 0, isFinal: true },
        { text: "This", start_ms: 800, end_ms: 900, channel: 0, isFinal: true },
        { text: "is", start_ms: 950, end_ms: 1050, channel: 0, isFinal: true },
        { text: "two.", start_ms: 1100, end_ms: 1300, channel: 0, isFinal: true },
      ];

      const segments = splitIntoSegments(words, { maxWordsPerSegment: 5 });

      expect(segments).toHaveLength(2);
      expect(segments[0][segments[0].length - 1].text).toBe("one.");
    });

    test("considers timestamp gaps in scoring", () => {
      const words = [
        { text: "First", start_ms: 0, end_ms: 500, channel: 0, isFinal: true },
        { text: "word", start_ms: 600, end_ms: 1000, channel: 0, isFinal: true },
        { text: "here", start_ms: 3500, end_ms: 4000, channel: 0, isFinal: true },
        { text: "after", start_ms: 4100, end_ms: 4500, channel: 0, isFinal: true },
        { text: "gap", start_ms: 4600, end_ms: 5000, channel: 0, isFinal: true },
      ];

      const segments = splitIntoSegments(words, { maxWordsPerSegment: 10, minGapMs: 2000 });

      expect(segments).toHaveLength(2);
      expect(segments[0]).toHaveLength(2);
      expect(segments[1]).toHaveLength(3);
    });
  });

  describe("edge cases", () => {
    test("handles empty array", () => {
      const segments = splitIntoSegments([]);
      expect(segments).toHaveLength(0);
    });

    test("handles single word", () => {
      const words = [{ text: "Solo", start_ms: 0, end_ms: 500, channel: 0, isFinal: true }];
      const segments = splitIntoSegments(words);

      expect(segments).toHaveLength(1);
      expect(segments[0]).toHaveLength(1);
    });

    test("handles all partial words", () => {
      const words = [
        { text: "Partial", start_ms: 0, end_ms: 500, channel: 0, isFinal: false },
        { text: "words", start_ms: 600, end_ms: 1100, channel: 0, isFinal: false },
      ];

      const segments = splitIntoSegments(words);

      expect(segments).toHaveLength(1);
      expect(segments[0]).toHaveLength(2);
    });
  });
});
