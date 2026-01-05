import { describe, expect, test } from "vitest";

import type {
  NoteFrontmatter,
  ParticipantData,
  SessionMetaJson,
  TranscriptJson,
  TranscriptWithData,
} from "./transform";

describe("SessionMetaJson type", () => {
  test("creates valid session meta", () => {
    const meta: SessionMetaJson = {
      id: "session-1",
      user_id: "user-1",
      created_at: "2024-01-01T00:00:00Z",
      title: "Test Session",
      participants: [],
    };

    expect(meta.id).toBe("session-1");
    expect(meta.user_id).toBe("user-1");
    expect(meta.event_id).toBeUndefined();
    expect(meta.tags).toBeUndefined();
  });

  test("creates session meta with optional fields", () => {
    const participant: ParticipantData = {
      id: "participant-1",
      user_id: "user-1",
      created_at: "2024-01-01T00:00:00Z",
      session_id: "session-1",
      human_id: "human-1",
      source: "manual",
    };

    const meta: SessionMetaJson = {
      id: "session-1",
      user_id: "user-1",
      created_at: "2024-01-01T00:00:00Z",
      title: "Test Session",
      event_id: "event-1",
      participants: [participant],
      tags: ["tag1", "tag2"],
    };

    expect(meta.event_id).toBe("event-1");
    expect(meta.participants).toHaveLength(1);
    expect(meta.participants[0].human_id).toBe("human-1");
    expect(meta.tags).toEqual(["tag1", "tag2"]);
  });
});

describe("TranscriptJson type", () => {
  test("creates valid transcript json", () => {
    const transcript: TranscriptWithData = {
      id: "transcript-1",
      user_id: "user-1",
      created_at: "2024-01-01T00:00:00Z",
      session_id: "session-1",
      started_at: 0,
      ended_at: 1000,
      words: [
        {
          id: "word-1",
          user_id: "user-1",
          created_at: "2024-01-01T00:00:01Z",
          transcript_id: "transcript-1",
          text: "Hello",
          start_ms: 0,
          end_ms: 500,
          channel: 0,
        },
      ],
      speaker_hints: [
        {
          id: "hint-1",
          user_id: "user-1",
          created_at: "2024-01-01T00:00:00Z",
          transcript_id: "transcript-1",
          word_id: "word-1",
          type: "human",
          value: "human-1",
        },
      ],
    };

    const json: TranscriptJson = {
      transcripts: [transcript],
    };

    expect(json.transcripts).toHaveLength(1);
    expect(json.transcripts[0].words).toHaveLength(1);
    expect(json.transcripts[0].speaker_hints).toHaveLength(1);
  });

  test("handles empty transcripts", () => {
    const json: TranscriptJson = {
      transcripts: [],
    };

    expect(json.transcripts).toHaveLength(0);
  });
});

describe("NoteFrontmatter type", () => {
  test("creates enhanced_note frontmatter", () => {
    const frontmatter: NoteFrontmatter = {
      id: "note-1",
      session_id: "session-1",
      type: "enhanced_note",
      template_id: "template-1",
      position: 0,
      title: "Summary",
    };

    expect(frontmatter.type).toBe("enhanced_note");
    expect(frontmatter.template_id).toBe("template-1");
  });

  test("creates memo frontmatter", () => {
    const frontmatter: NoteFrontmatter = {
      id: "session-1",
      session_id: "session-1",
      type: "memo",
    };

    expect(frontmatter.type).toBe("memo");
    expect(frontmatter.template_id).toBeUndefined();
    expect(frontmatter.position).toBeUndefined();
    expect(frontmatter.title).toBeUndefined();
  });
});
