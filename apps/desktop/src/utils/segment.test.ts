import { describe, expect, test } from "vitest";
import { buildSegments, SegmentKey } from "./segment";

describe("buildSegments", () => {
  const testCases = [
    {
      name: "returns no segments when no words are provided",
      finalWords: [],
      partialWords: [],
      expected: [],
    },
    {
      name: "simple multi-channel example without merging",
      finalWords: [
        { text: "1", start_ms: 0, end_ms: 100, channel: 0 },
      ],
      partialWords: [
        { text: "2", start_ms: 150, end_ms: 200, channel: 0 },
        { text: "3", start_ms: 150, end_ms: 200, channel: 1 },
        { text: "4", start_ms: 210, end_ms: 260, channel: 1 },
      ],
      expected: [
        expect.objectContaining({
          key: SegmentKey.Channel({ channel: 0 }),
          words: [
            expect.objectContaining({ text: "1", isFinal: true }),
            expect.objectContaining({ text: "2", isFinal: false }),
          ],
        }),
        expect.objectContaining({
          key: SegmentKey.Channel({ channel: 1 }),
          words: [
            expect.objectContaining({ text: "3", isFinal: false }),
            expect.objectContaining({ text: "4", isFinal: false }),
          ],
        }),
      ],
    },
    {
      name: "merges same-channel turns across interleaving speakers",
      finalWords: [
        { text: "3", start_ms: 300, end_ms: 400, channel: 1 },
      ],
      partialWords: [
        { text: "1", start_ms: 0, end_ms: 100, channel: 0 },
        { text: "2", start_ms: 600, end_ms: 700, channel: 0 },
      ],
      expected: [
        expect.objectContaining({
          key: SegmentKey.Channel({ channel: 0 }),
          words: [
            expect.objectContaining({ text: "1" }),
            expect.objectContaining({ text: "2" }),
          ],
        }),
        expect.objectContaining({
          key: SegmentKey.Channel({ channel: 1 }),
          words: [
            expect.objectContaining({ text: "3" }),
          ],
        }),
      ],
    },
    {
      name: "should be always sorted per channel by start_ms",
      finalWords: [
        { text: "3", start_ms: 400, end_ms: 450, channel: 0 },
      ],
      partialWords: [
        { text: "1", start_ms: 100, end_ms: 150, channel: 0 },
        { text: "2", start_ms: 250, end_ms: 300, channel: 0 },
      ],
      expected: [
        expect.objectContaining({
          key: SegmentKey.Channel({ channel: 0 }),
          words: [
            expect.objectContaining({ text: "1" }),
            expect.objectContaining({ text: "2" }),
            expect.objectContaining({ text: "3" }),
          ],
        }),
      ],
    },
    {
      name: "does not merge speaker turns once it exceeds the max gap",
      finalWords: [
        { text: "first", start_ms: 0, end_ms: 100, channel: 0 },
        { text: "return", start_ms: 2101, end_ms: 2201, channel: 0 },
        { text: "other", start_ms: 150, end_ms: 200, channel: 1 },
      ],
      partialWords: [],
      expected: [
        expect.objectContaining({
          key: SegmentKey.Channel({ channel: 0 }),
          words: [expect.objectContaining({ text: "first" })],
        }),
        expect.objectContaining({
          key: SegmentKey.Channel({ channel: 1 }),
          words: [expect.objectContaining({ text: "other" })],
        }),
        expect.objectContaining({
          key: SegmentKey.Channel({ channel: 0 }),
          words: [expect.objectContaining({ text: "return" })],
        }),
      ],
    },
    {
      name: "merges when gap is exactly at maxGapMs threshold (2000ms)",
      finalWords: [
        { text: "first", start_ms: 0, end_ms: 100, channel: 0 },
        { text: "second", start_ms: 2100, end_ms: 2200, channel: 0 },
      ],
      partialWords: [],
      expected: [
        expect.objectContaining({
          key: SegmentKey.Channel({ channel: 0 }),
          words: [
            expect.objectContaining({ text: "first" }),
            expect.objectContaining({ text: "second" }),
          ],
        }),
      ],
    },
    {
      name: "handles three or more distinct channels",
      finalWords: [
        { text: "a", start_ms: 0, end_ms: 100, channel: 0 },
        { text: "b", start_ms: 150, end_ms: 250, channel: 1 },
        { text: "c", start_ms: 300, end_ms: 400, channel: 2 },
      ],
      partialWords: [],
      expected: [
        expect.objectContaining({
          key: SegmentKey.Channel({ channel: 0 }),
          words: [expect.objectContaining({ text: "a" })],
        }),
        expect.objectContaining({
          key: SegmentKey.Channel({ channel: 1 }),
          words: [expect.objectContaining({ text: "b" })],
        }),
        expect.objectContaining({
          key: SegmentKey.Channel({ channel: 2 }),
          words: [expect.objectContaining({ text: "c" })],
        }),
      ],
    },
    {
      name: "handles single word input",
      finalWords: [
        { text: "only", start_ms: 0, end_ms: 100, channel: 0 },
      ],
      partialWords: [],
      expected: [
        expect.objectContaining({
          key: SegmentKey.Channel({ channel: 0 }),
          words: [expect.objectContaining({ text: "only", isFinal: true })],
        }),
      ],
    },
    {
      name: "splits segments by speaker within same channel",
      finalWords: [
        { text: "hi", start_ms: 0, end_ms: 100, channel: 0 },
        { text: "hello", start_ms: 150, end_ms: 250, channel: 0 },
        { text: "again", start_ms: 300, end_ms: 400, channel: 0 },
      ],
      partialWords: [],
      speakerHints: [
        { wordIndex: 0, speakerIndex: 0 },
        { wordIndex: 1, speakerIndex: 1 },
        { wordIndex: 2, speakerIndex: 0 },
      ],
      expected: [
        expect.objectContaining({
          key: SegmentKey.ChannelSpeaker({ channel: 0, speakerIndex: 0 }),
          words: [expect.objectContaining({ text: "hi" })],
        }),
        expect.objectContaining({
          key: SegmentKey.ChannelSpeaker({ channel: 0, speakerIndex: 1 }),
          words: [expect.objectContaining({ text: "hello" })],
        }),
        expect.objectContaining({
          key: SegmentKey.ChannelSpeaker({ channel: 0, speakerIndex: 0 }),
          words: [expect.objectContaining({ text: "again" })],
        }),
      ],
    },
    {
      name: "merges multiple short interruptions within gap threshold",
      finalWords: [
        { text: "a1", start_ms: 0, end_ms: 100, channel: 0 },
        { text: "b1", start_ms: 150, end_ms: 200, channel: 1 },
        { text: "a2", start_ms: 250, end_ms: 300, channel: 0 },
        { text: "b2", start_ms: 350, end_ms: 400, channel: 1 },
        { text: "a3", start_ms: 450, end_ms: 500, channel: 0 },
      ],
      partialWords: [],
      expected: [
        expect.objectContaining({
          key: SegmentKey.Channel({ channel: 0 }),
          words: [
            expect.objectContaining({ text: "a1" }),
            expect.objectContaining({ text: "a2" }),
            expect.objectContaining({ text: "a3" }),
          ],
        }),
        expect.objectContaining({
          key: SegmentKey.Channel({ channel: 1 }),
          words: [
            expect.objectContaining({ text: "b1" }),
            expect.objectContaining({ text: "b2" }),
          ],
        }),
      ],
    },
  ];

  test.each(testCases)("$name", ({ finalWords, partialWords, speakerHints, expected }) => {
    const segments = buildSegments(finalWords, partialWords, speakerHints);
    expect(segments).toEqual(expected);
  });
});
