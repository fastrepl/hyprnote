import { createMergeableStore } from "tinybase/with-schemas";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { SCHEMA, type Schemas } from "@hypr/store";

import { createTranscriptPersister } from "./persister";

vi.mock("@hypr/plugin-path2", () => ({
  commands: {
    base: vi.fn().mockResolvedValue("/mock/data/dir/hyprnote"),
  },
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  exists: vi.fn().mockResolvedValue(true),
  mkdir: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@hypr/plugin-export", () => ({
  commands: {
    exportJsonBatch: vi.fn().mockResolvedValue({ status: "ok", data: null }),
  },
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
      const { commands } = await import("@hypr/plugin-export");

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

      expect(commands.exportJsonBatch).toHaveBeenCalledTimes(1);
      const batchItems = vi.mocked(commands.exportJsonBatch).mock.calls[0][0];
      expect(batchItems).toHaveLength(1);
      expect(batchItems[0][1]).toBe(
        "/mock/data/dir/hyprnote/sessions/session-1/_transcript.json",
      );

      const content = batchItems[0][0] as { transcripts: unknown[] };
      expect(content.transcripts).toHaveLength(1);
      expect((content.transcripts[0] as { id: string }).id).toBe(transcriptId);
      expect(
        (content.transcripts[0] as { session_id: string }).session_id,
      ).toBe(sessionId);
      expect(
        (content.transcripts[0] as { words: unknown[] }).words,
      ).toHaveLength(2);
      expect(
        (content.transcripts[0] as { speaker_hints: unknown[] }).speaker_hints,
      ).toHaveLength(1);
    });

    test("does not write when no transcripts exist", async () => {
      const { commands } = await import("@hypr/plugin-export");

      const persister = createTranscriptPersister<Schemas>(store);
      await persister.save();

      expect(commands.exportJsonBatch).not.toHaveBeenCalled();
    });

    test("groups multiple transcripts by session", async () => {
      const { commands } = await import("@hypr/plugin-export");

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

      expect(commands.exportJsonBatch).toHaveBeenCalledTimes(1);
      const batchItems = vi.mocked(commands.exportJsonBatch).mock.calls[0][0];
      expect(batchItems).toHaveLength(1);

      const content = batchItems[0][0] as { transcripts: unknown[] };
      expect(content.transcripts).toHaveLength(2);
    });

    test("writes separate files for different sessions", async () => {
      const { commands } = await import("@hypr/plugin-export");

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

      expect(commands.exportJsonBatch).toHaveBeenCalledTimes(1);
      const batchItems = vi.mocked(commands.exportJsonBatch).mock.calls[0][0];
      expect(batchItems).toHaveLength(2);

      const paths = batchItems.map((item) => item[1]);
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
      const { commands } = await import("@hypr/plugin-export");

      store.setRow("transcripts", "transcript-1", {
        user_id: "user-1",
        created_at: new Date().toISOString(),
        session_id: "session-1",
        started_at: 1000,
        ended_at: 2000,
      });

      const persister = createTranscriptPersister<Schemas>(store);
      await persister.save();

      const batchItems = vi.mocked(commands.exportJsonBatch).mock.calls[0][0];
      const content = batchItems[0][0] as {
        transcripts: Array<{ words: unknown[]; speaker_hints: unknown[] }>;
      };

      expect(content.transcripts[0].words).toEqual([]);
      expect(content.transcripts[0].speaker_hints).toEqual([]);
    });
  });
});
