import { describe, expect, it } from "vitest";

import { buildSegments } from "./transcript";

describe("buildSegments", () => {
  const WORD = (
    {
      text,
      channel,
      start_ms,
      end_ms,
    }: {
      text: string;
      channel: number;
      start_ms: number;
      end_ms: number;
    },
  ) => ({
    user_id: "TODO",
    created_at: "TODO",
    transcript_id: "TODO",
    text,
    channel,
    start_ms,
    end_ms,
  });

  const testcases = [
    {
      description: "returns empty array for empty input",
      words: [],
      segments: [],
    },
    {
      description: "simple single segment from single word",
      words: [
        WORD({ text: "hello", channel: 0, start_ms: 0, end_ms: 100 }),
      ],
      segments: [
        { speaker: "Speaker 0", text: "hello" },
      ],
    },
    {
      description: "merge adjacent words from same channel",
      words: [
        WORD({ text: "hello", channel: 0, start_ms: 0, end_ms: 100 }),
        WORD({ text: "world", channel: 0, start_ms: 120, end_ms: 220 }),
      ],
      segments: [
        { speaker: "Speaker 0", text: "hello world" },
      ],
    },
    {
      description: "different channels are different speakers",
      words: [
        WORD({ text: "hello", channel: 0, start_ms: 0, end_ms: 100 }),
        WORD({ text: "world", channel: 1, start_ms: 120, end_ms: 220 }),
      ],
      segments: [
        { speaker: "Speaker 0", text: "hello" },
        { speaker: "Speaker 1", text: "world" },
      ],
    },
  ];

  it.each(testcases)("$description", ({ words, segments }) => {
    const result = buildSegments(
      {
        words,
        speakerFromChannel: (channel) => `Speaker ${channel}`,
      },
    );

    expect(result).toEqual(segments);
  });
});
