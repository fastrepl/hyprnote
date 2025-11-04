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
          key: SegmentKey.make({ channel: 0 }),
          words: [
            expect.objectContaining({ text: "1", isFinal: true }),
            expect.objectContaining({ text: "2", isFinal: false }),
          ],
        }),
        expect.objectContaining({
          key: SegmentKey.make({ channel: 1 }),
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
          key: SegmentKey.make({ channel: 0 }),
          words: [
            expect.objectContaining({ text: "1" }),
            expect.objectContaining({ text: "2" }),
          ],
        }),
        expect.objectContaining({
          key: SegmentKey.make({ channel: 1 }),
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
          key: SegmentKey.make({ channel: 0 }),
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
          key: SegmentKey.make({ channel: 0 }),
          words: [expect.objectContaining({ text: "first" })],
        }),
        expect.objectContaining({
          key: SegmentKey.make({ channel: 1 }),
          words: [expect.objectContaining({ text: "other" })],
        }),
        expect.objectContaining({
          key: SegmentKey.make({ channel: 0 }),
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
          key: SegmentKey.make({ channel: 0 }),
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
          key: SegmentKey.make({ channel: 0 }),
          words: [expect.objectContaining({ text: "a" })],
        }),
        expect.objectContaining({
          key: SegmentKey.make({ channel: 1 }),
          words: [expect.objectContaining({ text: "b" })],
        }),
        expect.objectContaining({
          key: SegmentKey.make({ channel: 2 }),
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
          key: SegmentKey.make({ channel: 0 }),
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
        { wordIndex: 0, data: { type: "provider_speaker_index" as const, speaker_index: 0 } },
        { wordIndex: 1, data: { type: "provider_speaker_index" as const, speaker_index: 1 } },
        { wordIndex: 2, data: { type: "provider_speaker_index" as const, speaker_index: 0 } },
      ],
      expected: [
        expect.objectContaining({
          key: SegmentKey.make({ channel: 0, speaker_index: 0 }),
          words: [expect.objectContaining({ text: "hi" })],
        }),
        expect.objectContaining({
          key: SegmentKey.make({ channel: 0, speaker_index: 1 }),
          words: [expect.objectContaining({ text: "hello" })],
        }),
        expect.objectContaining({
          key: SegmentKey.make({ channel: 0, speaker_index: 0 }),
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
          key: SegmentKey.make({ channel: 0 }),
          words: [
            expect.objectContaining({ text: "a1" }),
            expect.objectContaining({ text: "a2" }),
            expect.objectContaining({ text: "a3" }),
          ],
        }),
        expect.objectContaining({
          key: SegmentKey.make({ channel: 1 }),
          words: [
            expect.objectContaining({ text: "b1" }),
            expect.objectContaining({ text: "b2" }),
          ],
        }),
      ],
    },
    {
      name: "propagates human id across shared speaker index",
      finalWords: [
        { text: "hi", start_ms: 0, end_ms: 100, channel: 0 },
        { text: "there", start_ms: 200, end_ms: 300, channel: 0 },
      ],
      partialWords: [],
      speakerHints: [
        { wordIndex: 0, data: { type: "provider_speaker_index" as const, speaker_index: 1 } },
        { wordIndex: 1, data: { type: "provider_speaker_index" as const, speaker_index: 1 } },
        { wordIndex: 1, data: { type: "user_speaker_assignment" as const, human_id: "alice" } },
      ],
      expected: [
        expect.objectContaining({
          key: SegmentKey.make({ channel: 0, speaker_index: 1, speaker_human_id: "alice" }),
          words: [
            expect.objectContaining({ text: "hi" }),
            expect.objectContaining({ text: "there" }),
          ],
        }),
      ],
    },
    {
      name: "infers human id for partial words via last known speaker",
      finalWords: [
        { text: "final", start_ms: 0, end_ms: 100, channel: 0 },
      ],
      partialWords: [
        { text: "partial", start_ms: 150, end_ms: 200, channel: 0 },
      ],
      speakerHints: [
        { wordIndex: 0, data: { type: "provider_speaker_index" as const, speaker_index: 2 } },
        { wordIndex: 0, data: { type: "user_speaker_assignment" as const, human_id: "bob" } },
      ],
      expected: [
        expect.objectContaining({
          key: SegmentKey.make({ channel: 0, speaker_index: 2, speaker_human_id: "bob" }),
          words: [
            expect.objectContaining({ text: "final" }),
            expect.objectContaining({ text: "partial" }),
          ],
        }),
      ],
    },
    {
      name: "splits segments when human id changes for same speaker index",
      finalWords: [
        { text: "first", start_ms: 0, end_ms: 100, channel: 0 },
        { text: "second", start_ms: 150, end_ms: 250, channel: 0 },
      ],
      partialWords: [],
      speakerHints: [
        { wordIndex: 0, data: { type: "provider_speaker_index" as const, speaker_index: 0 } },
        { wordIndex: 0, data: { type: "user_speaker_assignment" as const, human_id: "alice" } },
        { wordIndex: 1, data: { type: "provider_speaker_index" as const, speaker_index: 0 } },
        { wordIndex: 1, data: { type: "user_speaker_assignment" as const, human_id: "bob" } },
      ],
      expected: [
        expect.objectContaining({
          key: SegmentKey.make({ channel: 0, speaker_index: 0, speaker_human_id: "alice" }),
          words: [expect.objectContaining({ text: "first" })],
        }),
        expect.objectContaining({
          key: SegmentKey.make({ channel: 0, speaker_index: 0, speaker_human_id: "bob" }),
          words: [expect.objectContaining({ text: "second" })],
        }),
      ],
    },
    {
      name: "auto-assign based on provider speaker index",
      finalWords: [
        { text: "1", start_ms: 0, end_ms: 100, channel: 0 },
        { text: "2", start_ms: 100, end_ms: 200, channel: 1 },
        { text: "3", start_ms: 200, end_ms: 300, channel: 0 },
      ],
      partialWords: [],
      speakerHints: [
        { wordIndex: 0, data: { type: "provider_speaker_index" as const, speaker_index: 0 } },
        { wordIndex: 1, data: { type: "provider_speaker_index" as const, speaker_index: 1 } },
        { wordIndex: 2, data: { type: "provider_speaker_index" as const, speaker_index: 0 } },
        { wordIndex: 0, data: { type: "user_speaker_assignment" as const, human_id: "bob" } },
      ],
      expected: [
        expect.objectContaining({
          key: SegmentKey.make({ channel: 0, speaker_index: 0, speaker_human_id: "bob" }),
          words: [expect.objectContaining({ text: "1" })],
        }),
        expect.objectContaining({
          key: SegmentKey.make({ channel: 1, speaker_index: 1 }),
          words: [expect.objectContaining({ text: "2" })],
        }),
        expect.objectContaining({
          key: SegmentKey.make({ channel: 0, speaker_index: 0, speaker_human_id: "bob" }),
          words: [expect.objectContaining({ text: "3" })],
        }),
      ],
    },
    {
      name: "handles partial-only stream with speaker hints",
      finalWords: [],
      partialWords: [
        { text: "hello", start_ms: 0, end_ms: 80, channel: 0 },
        { text: "world", start_ms: 120, end_ms: 200, channel: 0 },
      ],
      speakerHints: [
        { wordIndex: 0, data: { type: "provider_speaker_index" as const, speaker_index: 3 } },
        { wordIndex: 0, data: { type: "user_speaker_assignment" as const, human_id: "alice" } },
      ],
      expected: [
        expect.objectContaining({
          key: SegmentKey.make({ channel: 0, speaker_index: 3, speaker_human_id: "alice" }),
          words: [
            expect.objectContaining({ text: "hello", isFinal: false }),
            expect.objectContaining({ text: "world", isFinal: false }),
          ],
        }),
      ],
    },
    {
      name: "applies speaker hints targeting partial word indexes",
      finalWords: [
        { text: "final", start_ms: 0, end_ms: 90, channel: 0 },
      ],
      partialWords: [
        { text: "partial", start_ms: 140, end_ms: 220, channel: 0 },
      ],
      speakerHints: [
        { wordIndex: 1, data: { type: "provider_speaker_index" as const, speaker_index: 4 } },
        { wordIndex: 1, data: { type: "user_speaker_assignment" as const, human_id: "alice" } },
      ],
      expected: [
        expect.objectContaining({
          key: SegmentKey.make({ channel: 0 }),
          words: [expect.objectContaining({ text: "final", isFinal: true })],
        }),
        expect.objectContaining({
          key: SegmentKey.make({ channel: 0, speaker_index: 4, speaker_human_id: "alice" }),
          words: [expect.objectContaining({ text: "partial", isFinal: false })],
        }),
      ],
    },
    {
      name: "merges using human assignment without provider index",
      finalWords: [
        { text: "alpha", start_ms: 0, end_ms: 100, channel: 0 },
        { text: "beta", start_ms: 140, end_ms: 240, channel: 0 },
      ],
      partialWords: [],
      speakerHints: [
        { wordIndex: 0, data: { type: "user_speaker_assignment" as const, human_id: "alice" } },
        { wordIndex: 1, data: { type: "user_speaker_assignment" as const, human_id: "alice" } },
      ],
      expected: [
        expect.objectContaining({
          key: SegmentKey.make({ channel: 0, speaker_human_id: "alice" }),
          words: [
            expect.objectContaining({ text: "alpha", isFinal: true }),
            expect.objectContaining({ text: "beta", isFinal: true }),
          ],
        }),
      ],
    },
    {
      name: "propagates human assignment to partial words without speaker index",
      finalWords: [{ text: "final", start_ms: 0, end_ms: 50, channel: 0 }],
      partialWords: [{ text: "partial", start_ms: 100, end_ms: 150, channel: 0 }],
      speakerHints: [{ wordIndex: 0, data: { type: "user_speaker_assignment" as const, human_id: "alice" } }],
      expected: [
        expect.objectContaining({
          key: SegmentKey.make({ channel: 0, speaker_human_id: "alice" }),
          words: [
            expect.objectContaining({ text: "final", isFinal: true }),
            expect.objectContaining({ text: "partial", isFinal: false }),
          ],
        }),
      ],
    },
    {
      name: "splits segments when channel-only human assignment changes",
      finalWords: [
        { text: "alice", start_ms: 0, end_ms: 50, channel: 0 },
        { text: "bob", start_ms: 120, end_ms: 170, channel: 0 },
      ],
      partialWords: [],
      speakerHints: [
        { wordIndex: 0, data: { type: "user_speaker_assignment" as const, human_id: "alice" } },
        { wordIndex: 1, data: { type: "user_speaker_assignment" as const, human_id: "bob" } },
      ],
      expected: [
        expect.objectContaining({
          key: SegmentKey.make({ channel: 0, speaker_human_id: "alice" }),
          words: [expect.objectContaining({ text: "alice" })],
        }),
        expect.objectContaining({
          key: SegmentKey.make({ channel: 0, speaker_human_id: "bob" }),
          words: [expect.objectContaining({ text: "bob" })],
        }),
      ],
    },
    {
      name: "retains human assignment across partial-only stream without speaker index",
      finalWords: [],
      partialWords: [
        { text: "hello", start_ms: 0, end_ms: 80, channel: 1 },
        { text: "again", start_ms: 120, end_ms: 200, channel: 1 },
      ],
      speakerHints: [
        { wordIndex: 0, data: { type: "user_speaker_assignment" as const, human_id: "carol" } },
      ],
      expected: [
        expect.objectContaining({
          key: SegmentKey.make({ channel: 1, speaker_human_id: "carol" }),
          words: [
            expect.objectContaining({ text: "hello", isFinal: false }),
            expect.objectContaining({ text: "again", isFinal: false }),
          ],
        }),
      ],
    },
    {
      name: "propagates DirectMic channel identity to all channel 0 words",
      finalWords: [
        { text: " How", start_ms: 0, end_ms: 400, channel: 0 },
        { text: " is", start_ms: 400, end_ms: 600, channel: 0 },
        { text: " the", start_ms: 600, end_ms: 800, channel: 0 },
        { text: " project", start_ms: 800, end_ms: 1400, channel: 0 },
        { text: " going", start_ms: 1400, end_ms: 2000, channel: 0 },
        { text: " It's", start_ms: 4100, end_ms: 4500, channel: 1 },
        { text: " going", start_ms: 4500, end_ms: 4900, channel: 1 },
        { text: " really", start_ms: 4900, end_ms: 5300, channel: 1 },
        { text: " well", start_ms: 5300, end_ms: 5700, channel: 1 },
        { text: " thanks", start_ms: 5700, end_ms: 6100, channel: 1 },
        { text: " That's", start_ms: 8200, end_ms: 8600, channel: 0 },
        { text: " great", start_ms: 8600, end_ms: 9000, channel: 0 },
        { text: " to", start_ms: 9000, end_ms: 9200, channel: 0 },
        { text: " hear", start_ms: 9200, end_ms: 9800, channel: 0 },
      ],
      partialWords: [],
      speakerHints: [
        { wordIndex: 0, data: { type: "user_speaker_assignment" as const, human_id: "carol" } },
      ],
      expected: [
        expect.objectContaining({
          key: SegmentKey.make({ channel: 0, speaker_human_id: "carol" }),
          words: [
            expect.objectContaining({ text: " How", isFinal: true }),
            expect.objectContaining({ text: " is", isFinal: true }),
            expect.objectContaining({ text: " the", isFinal: true }),
            expect.objectContaining({ text: " project", isFinal: true }),
            expect.objectContaining({ text: " going", isFinal: true }),
          ],
        }),
        expect.objectContaining({
          key: SegmentKey.make({ channel: 1 }),
          words: [
            expect.objectContaining({ text: " It's", isFinal: true }),
            expect.objectContaining({ text: " going", isFinal: true }),
            expect.objectContaining({ text: " really", isFinal: true }),
            expect.objectContaining({ text: " well", isFinal: true }),
            expect.objectContaining({ text: " thanks", isFinal: true }),
          ],
        }),
        expect.objectContaining({
          key: SegmentKey.make({ channel: 0, speaker_human_id: "carol" }),
          words: [
            expect.objectContaining({ text: " That's", isFinal: true }),
            expect.objectContaining({ text: " great", isFinal: true }),
            expect.objectContaining({ text: " to", isFinal: true }),
            expect.objectContaining({ text: " hear", isFinal: true }),
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
