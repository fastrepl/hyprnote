import { describe, expect, test } from "vitest";
import { word } from "./test-utils";
import "./test-utils";

import { buildSegments, mergeWordsByChannel, splitIntoSegments } from "./segment";

describe("buildSegments", () => {
  test("merges partial and final words and groups by channel turns", () => {
    const finalWords = [
      word({ text: "hello", start_ms: 0, end_ms: 100 }),
      word({ text: "world", start_ms: 150, end_ms: 200 }),
      word({ text: "respond", start_ms: 250, end_ms: 300, channel: 1 }),
    ];

    const partialWords = [
      [
        { text: "back", start_ms: 310, end_ms: 360, channel: 1 },
      ],
    ];

    const segments = buildSegments(finalWords, partialWords);

    expect(segments).toHaveLength(2);
    expect(segments[0].channel).toBe(0);
    expect(segments[0].words.map((w) => w.text)).toEqual(["hello", "world"]);
    expect(segments[1].channel).toBe(1);
    expect(segments[1].words.map((w) => w.text)).toEqual(["respond", "back"]);
  });

  test("sorts mixed channels by time and preserves isFinal flag", () => {
    const finalWords = [
      word({ text: "first" }),
    ];

    const partialWords = [
      [
        { text: "second", start_ms: 60, end_ms: 120, channel: 0 },
      ],
      [
        { text: "other", start_ms: 55, end_ms: 90, channel: 1 },
      ],
    ];

    const segments = buildSegments(finalWords, partialWords);

    expect(segments).toHaveLength(2);
    expect(segments[0].channel).toBe(0);
    expect(segments[0].words).toHaveLength(2);
    expect(segments[0].words[0].isFinal).toBe(true);
    expect(segments[0].words[0].text).toBe("first");
    expect(segments[0].words[1].isFinal).toBe(false);
    expect(segments[0].words[1].text).toBe("second");
    expect(segments[1].channel).toBe(1);
    expect(segments[1].words[0].isFinal).toBe(false);
    expect(segments[1].words[0].text).toBe("other");
  });

  test("merges same-channel turns across interleaving speakers", () => {
    const finalWords = [
      word({ text: "alpha", start_ms: 0, end_ms: 100 }),
      word({ text: "gamma", start_ms: 600, end_ms: 700 }),
    ];

    const partialWords = [
      [
        { text: "beta", start_ms: 300, end_ms: 400, channel: 1 },
      ],
    ];

    const segments = buildSegments(finalWords, partialWords);

    expect(segments).toHaveLength(2);
    expect(segments[0].channel).toBe(0);
    expect(segments[0].words.map((w) => w.text)).toEqual(["alpha", "gamma"]);
    expect(segments[1].channel).toBe(1);
    expect(segments[1].words.map((w) => w.text)).toEqual(["beta"]);
  });
});

describe("mergeWordsByChannel", () => {
  describe("channel assignment and merging", () => {
    test("uses word.channel property, not partialWords array index", () => {
      const partialWords = [
        [
          { text: "first", start_ms: 0, end_ms: 100, channel: 0 },
          { text: "second", start_ms: 200, end_ms: 300, channel: 0 },
        ],
      ];

      const result = mergeWordsByChannel([], partialWords);

      expect(result).toHaveChannels(0);
      expect(result).toHaveWordsInChannel(0, 2);
    });

    test("handles multiple channels with final and partial words", () => {
      const finalWords = [
        word({ text: "final0" }),
        word({ text: "final1", channel: 1 }),
      ];

      const partialWords = [
        [{ text: "partial0", start_ms: 200, end_ms: 300, channel: 0 }],
        [{ text: "partial1", start_ms: 200, end_ms: 300, channel: 1 }],
      ];

      const result = mergeWordsByChannel(finalWords, partialWords);

      expect(result).toHaveChannels(0, 1);
      expect(result).toHaveWordsInChannel(0, 2);
      expect(result).toHaveWordsInChannel(1, 2);
    });

    test("sorts words by start_ms and marks final/partial correctly", () => {
      const finalWords = [
        word({ text: "third", start_ms: 600, end_ms: 700 }),
        word({ text: "first" }),
      ];

      const partialWords = [
        [
          { text: "fourth", start_ms: 800, end_ms: 900, channel: 0 },
          { text: "second", start_ms: 200, end_ms: 300, channel: 0 },
        ],
      ];

      const result = mergeWordsByChannel(finalWords, partialWords);

      expect(result).toHaveWordsInOrder(0, ["first", "second", "third", "fourth"]);
      expect(result.get(0)?.[0].isFinal).toBe(true);
      expect(result.get(0)?.[1].isFinal).toBe(false);
    });
  });

  describe("edge cases", () => {
    test("handles empty inputs", () => {
      const result = mergeWordsByChannel([], []);
      expect(result.size).toBe(0);
    });

    test("handles only final words", () => {
      const finalWords = [word({ text: "only" })];
      const result = mergeWordsByChannel(finalWords, []);

      expect(result).toHaveWordsInChannel(0, 1);
      expect(result.get(0)?.[0].isFinal).toBe(true);
    });

    test("handles only partial words", () => {
      const partialWords = [
        [{ text: "only", start_ms: 0, end_ms: 100, channel: 0 }],
      ];
      const result = mergeWordsByChannel([], partialWords);

      expect(result).toHaveWordsInChannel(0, 1);
      expect(result.get(0)?.[0].isFinal).toBe(false);
    });

    test("handles multiple partialWords arrays", () => {
      const partialWords = [
        [
          { text: "word1", start_ms: 0, end_ms: 100, channel: 0 },
          { text: "word2", start_ms: 200, end_ms: 300, channel: 0 },
        ],
        [{ text: "word3", start_ms: 0, end_ms: 100, channel: 1 }],
      ];

      const result = mergeWordsByChannel([], partialWords);

      expect(result).toHaveChannels(0, 1);
      expect(result).toHaveWordsInChannel(0, 2);
      expect(result).toHaveWordsInChannel(1, 1);
    });
  });
});

describe("splitIntoSegments", () => {
  describe("basic splitting", () => {
    test("keeps short sequences in a single segment", () => {
      const words = [
        word({ text: "Hello", start_ms: 0, end_ms: 500 }),
        word({ text: "world", start_ms: 600, end_ms: 1100 }),
      ];

      const segments = splitIntoSegments(words);

      expect(segments).toHaveLength(1);
      expect(segments[0]).toHaveLength(2);
    });

    test("splits on large timestamp gaps (>2000ms)", () => {
      const words = [
        word({ text: "First", start_ms: 0, end_ms: 500 }),
        word({ text: "sentence.", start_ms: 600, end_ms: 1100 }),
        word({ text: "Second", start_ms: 4000, end_ms: 4500 }),
        word({ text: "sentence.", start_ms: 4600, end_ms: 5100 }),
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
        word({ text: "First", start_ms: 0, end_ms: 500 }),
        word({ text: "sentence.", start_ms: 600, end_ms: 1100 }),
        word({ text: "Second", start_ms: 1200, end_ms: 1700 }),
        word({ text: "sentence!", start_ms: 1800, end_ms: 2300 }),
        word({ text: "Third", start_ms: 2400, end_ms: 2900 }),
        word({ text: "one?", start_ms: 3000, end_ms: 3500 }),
      ];

      const segments = splitIntoSegments(words, { maxWordsPerSegment: 4 });

      expect(segments).toHaveLength(2);
      expect(segments[0]).toHaveLength(4);
      expect(segments[0][3].text).toBe("sentence!");
      expect(segments[1]).toHaveLength(2);
    });

    test("recognizes period, exclamation, and question marks as sentence endings", () => {
      const words = [
        word({ text: "Period.", start_ms: 0, end_ms: 500 }),
        word({ text: "Question?", start_ms: 1500, end_ms: 2000 }),
        word({ text: "Exclamation!", start_ms: 3500, end_ms: 4000 }),
      ];

      const segments = splitIntoSegments(words, { maxWordsPerSegment: 2 });

      expect(segments).toHaveLength(2);
    });
  });

  describe("segment size limits", () => {
    test("splits segments that exceed maxWordsPerSegment", () => {
      const words = Array.from(
        { length: 50 },
        (_, i) => word({ text: `word${i}`, start_ms: i * 100, end_ms: i * 100 + 50 }),
      );

      const segments = splitIntoSegments(words, { maxWordsPerSegment: 20 });

      expect(segments.length).toBeGreaterThan(2);
      segments.forEach((segment) => {
        expect(segment.length).toBeLessThanOrEqual(20);
      });
    });

    test("respects custom maxWordsPerSegment", () => {
      const words = Array.from(
        { length: 30 },
        (_, i) => word({ text: `word${i}`, start_ms: i * 100, end_ms: i * 100 + 50 }),
      );

      const segments = splitIntoSegments(words, { maxWordsPerSegment: 10 });

      expect(segments).toHaveLength(3);
      segments.forEach((segment) => {
        expect(segment.length).toBeLessThanOrEqual(10);
      });
    });

    test("falls back to splitting when no candidate gap scores positively", () => {
      const words = [
        word({ text: "one", start_ms: 0, end_ms: 100 }),
        word({ text: "two", start_ms: 150, end_ms: 250 }),
        word({ text: "three", start_ms: 300, end_ms: 400 }),
        word({ text: "four", start_ms: 450, end_ms: 550 }),
      ];

      const segments = splitIntoSegments(words, { maxWordsPerSegment: 3 });

      expect(segments).toHaveLength(2);
      expect(segments[0].map((w) => w.text)).toEqual(["one", "two", "three"]);
      expect(segments[1].map((w) => w.text)).toEqual(["four"]);
    });
  });

  describe("timing edge cases", () => {
    test("handles overlapping timestamps without forcing split", () => {
      const words = [
        word({ text: "Overlap1", start_ms: 0, end_ms: 500 }),
        word({ text: "Overlap2", start_ms: 400, end_ms: 700 }),
        word({ text: "Trailing", start_ms: 750, end_ms: 900 }),
      ];

      const segments = splitIntoSegments(words);

      expect(segments).toHaveLength(1);
      expect(segments[0].map((w) => w.text)).toEqual(["Overlap1", "Overlap2", "Trailing"]);
    });

    test("honors custom minGapMs when evaluating hard splits", () => {
      const words = [
        word({ text: "Short", start_ms: 0, end_ms: 300 }),
        word({ text: "Break", start_ms: 900, end_ms: 1200 }),
        word({ text: "Resume", start_ms: 1400, end_ms: 1700 }),
      ];

      const segments = splitIntoSegments(words, { minGapMs: 500 });

      expect(segments).toHaveLength(2);
      expect(segments[0].map((w) => w.text)).toEqual(["Short"]);
      expect(segments[1].map((w) => w.text)).toEqual(["Break", "Resume"]);
    });
  });

  describe("scoring and optimization", () => {
    test("prefers sentence boundaries over mid-sentence splits when both exceed limit", () => {
      const words = [
        word({ text: "This" }),
        word({ text: "is", start_ms: 150, end_ms: 250 }),
        word({ text: "sentence", start_ms: 300, end_ms: 500 }),
        word({ text: "one.", start_ms: 550, end_ms: 750 }),
        word({ text: "This", start_ms: 800, end_ms: 900 }),
        word({ text: "is", start_ms: 950, end_ms: 1050 }),
        word({ text: "two.", start_ms: 1100, end_ms: 1300 }),
      ];

      const segments = splitIntoSegments(words, { maxWordsPerSegment: 5 });

      expect(segments).toHaveLength(2);
      expect(segments[0][segments[0].length - 1].text).toBe("one.");
    });

    test("considers timestamp gaps in scoring", () => {
      const words = [
        word({ text: "First", start_ms: 0, end_ms: 500 }),
        word({ text: "word", start_ms: 600, end_ms: 1000 }),
        word({ text: "here", start_ms: 3500, end_ms: 4000 }),
        word({ text: "after", start_ms: 4100, end_ms: 4500 }),
        word({ text: "gap", start_ms: 4600, end_ms: 5000 }),
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
      const words = [word({ text: "Solo" })];
      const segments = splitIntoSegments(words);

      expect(segments).toHaveLength(1);
      expect(segments[0]).toHaveLength(1);
    });

    test("handles all partial words", () => {
      const words = [
        word({ text: "Partial", isFinal: false }),
        word({ text: "words", start_ms: 600, end_ms: 1100, isFinal: false }),
      ];

      const segments = splitIntoSegments(words);

      expect(segments).toHaveLength(1);
      expect(segments[0]).toHaveLength(2);
    });
  });
});
