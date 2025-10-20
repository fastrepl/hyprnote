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

  it.each([
    {
      description: "returns empty array for empty input",
      words: [],
      segments: [],
    },
    {
      description: "creates single segment from single word",
      words: [
        WORD({ text: "hello", channel: 0, start_ms: 0, end_ms: 100 }),
      ],
      segments: [
        { speaker: "Speaker 0", text: "hello" },
      ],
    },
  ])("$description", ({ words, segments }) => {
    const result = buildSegments({
      words,
      speakerFromChannel: (channel) => `Speaker ${channel}`,
    });

    expect(result).toEqual(segments);
  });
});
