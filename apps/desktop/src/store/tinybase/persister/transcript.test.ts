import { createMergeableStore } from "tinybase/with-schemas";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { SCHEMA, type Schemas } from "@hypr/store";

import { createTranscriptPersister } from "./transcript";

vi.mock("@hypr/plugin-path2", () => ({
  commands: {
    base: vi.fn().mockResolvedValue("/mock/data/dir/hyprnote"),
  },
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  exists: vi.fn().mockResolvedValue(true),
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeTextFile: vi.fn().mockResolvedValue(undefined),
}));

function createTestStore() {
  return createMergeableStore()
    .setTablesSchema(SCHEMA.table)
    .setValuesSchema(SCHEMA.value);
}

describe("createTranscriptPersister", () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
    vi.clearAllMocks();
  });

  test("returns a persister object with expected methods", () => {
    const persister = createTranscriptPersister<Schemas>(store);

    expect(persister).toBeDefined();
    expect(persister.save).toBeTypeOf("function");
    expect(persister.load).toBeTypeOf("function");
    expect(persister.destroy).toBeTypeOf("function");
  });

  test("load returns undefined (no-op)", async () => {
    const persister = createTranscriptPersister<Schemas>(store);

    const result = await persister.load();
    expect(result).toBe(persister);
  });

  describe("save", () => {
    test("exports transcript with words and speaker_hints to json file", async () => {
      const { writeTextFile } = await import("@tauri-apps/plugin-fs");

      const transcriptId = "transcript-1";
      const sessionId = "session-1";

      store.setRow("transcripts", transcriptId, {
        user_id: "user-1",
        created_at: new Date().toISOString(),
        session_id: sessionId,
        started_at: 1000,
        ended_at: 5000,
      });

      store.setRow("words", "word-1", {
        user_id: "user-1",
        created_at: new Date().toISOString(),
        transcript_id: transcriptId,
        text: "Hello",
        start_ms: 1000,
        end_ms: 1500,
        channel: 0,
        speaker: "Speaker 1",
        metadata: "{}",
      });

      store.setRow("words", "word-2", {
        user_id: "user-1",
        created_at: new Date().toISOString(),
        transcript_id: transcriptId,
        text: "world",
        start_ms: 1500,
        end_ms: 2000,
        channel: 0,
        speaker: "Speaker 1",
        metadata: "{}",
      });

      store.setRow("speaker_hints", "hint-1", {
        user_id: "user-1",
        created_at: new Date().toISOString(),
        transcript_id: transcriptId,
        word_id: "word-1",
        type: "manual",
        value: '{"humanId": "human-1"}',
      });

      const persister = createTranscriptPersister<Schemas>(store);
      await persister.save();

      expect(writeTextFile).toHaveBeenCalledTimes(1);
      expect(writeTextFile).toHaveBeenCalledWith(
        "/mock/data/dir/hyprnote/sessions/session-1/_transcript.json",
        expect.any(String),
      );

      const writtenContent = vi.mocked(writeTextFile).mock.calls[0][1];
      const parsed = JSON.parse(writtenContent);

      expect(parsed.transcripts).toHaveLength(1);
      expect(parsed.transcripts[0].id).toBe(transcriptId);
      expect(parsed.transcripts[0].session_id).toBe(sessionId);
      expect(parsed.transcripts[0].words).toHaveLength(2);
      expect(parsed.transcripts[0].speaker_hints).toHaveLength(1);
    });

    test("does not write when no transcripts exist", async () => {
      const { writeTextFile } = await import("@tauri-apps/plugin-fs");

      const persister = createTranscriptPersister<Schemas>(store);
      await persister.save();

      expect(writeTextFile).not.toHaveBeenCalled();
    });

    test("groups multiple transcripts by session", async () => {
      const { writeTextFile } = await import("@tauri-apps/plugin-fs");

      store.setRow("transcripts", "transcript-1", {
        user_id: "user-1",
        created_at: new Date().toISOString(),
        session_id: "session-1",
        started_at: 1000,
        ended_at: 2000,
      });

      store.setRow("transcripts", "transcript-2", {
        user_id: "user-1",
        created_at: new Date().toISOString(),
        session_id: "session-1",
        started_at: 3000,
        ended_at: 4000,
      });

      const persister = createTranscriptPersister<Schemas>(store);
      await persister.save();

      expect(writeTextFile).toHaveBeenCalledTimes(1);

      const writtenContent = vi.mocked(writeTextFile).mock.calls[0][1];
      const parsed = JSON.parse(writtenContent);

      expect(parsed.transcripts).toHaveLength(2);
    });

    test("writes separate files for different sessions", async () => {
      const { writeTextFile } = await import("@tauri-apps/plugin-fs");

      store.setRow("transcripts", "transcript-1", {
        user_id: "user-1",
        created_at: new Date().toISOString(),
        session_id: "session-1",
        started_at: 1000,
        ended_at: 2000,
      });

      store.setRow("transcripts", "transcript-2", {
        user_id: "user-1",
        created_at: new Date().toISOString(),
        session_id: "session-2",
        started_at: 1000,
        ended_at: 2000,
      });

      const persister = createTranscriptPersister<Schemas>(store);
      await persister.save();

      expect(writeTextFile).toHaveBeenCalledTimes(2);

      const paths = vi.mocked(writeTextFile).mock.calls.map((call) => call[0]);
      expect(paths).toContain(
        "/mock/data/dir/hyprnote/sessions/session-1/_transcript.json",
      );
      expect(paths).toContain(
        "/mock/data/dir/hyprnote/sessions/session-2/_transcript.json",
      );
    });

    test("creates directory if it does not exist", async () => {
      const { exists, mkdir } = await import("@tauri-apps/plugin-fs");
      vi.mocked(exists).mockResolvedValue(false);

      store.setRow("transcripts", "transcript-1", {
        user_id: "user-1",
        created_at: new Date().toISOString(),
        session_id: "session-1",
        started_at: 1000,
        ended_at: 2000,
      });

      const persister = createTranscriptPersister<Schemas>(store);
      await persister.save();

      expect(mkdir).toHaveBeenCalledWith(
        "/mock/data/dir/hyprnote/sessions/session-1",
        { recursive: true },
      );
    });

    test("handles transcript with no words or hints", async () => {
      const { writeTextFile } = await import("@tauri-apps/plugin-fs");

      store.setRow("transcripts", "transcript-1", {
        user_id: "user-1",
        created_at: new Date().toISOString(),
        session_id: "session-1",
        started_at: 1000,
        ended_at: 2000,
      });

      const persister = createTranscriptPersister<Schemas>(store);
      await persister.save();

      const writtenContent = vi.mocked(writeTextFile).mock.calls[0][1];
      const parsed = JSON.parse(writtenContent);

      expect(parsed.transcripts[0].words).toEqual([]);
      expect(parsed.transcripts[0].speaker_hints).toEqual([]);
    });
  });
});
