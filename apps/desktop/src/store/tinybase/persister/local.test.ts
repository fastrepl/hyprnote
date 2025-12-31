import { createMergeableStore } from "tinybase/with-schemas";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { SCHEMA, type Schemas } from "@hypr/store";

import { createNotePersister } from "./note";

vi.mock("@hypr/plugin-path2", () => ({
  commands: {
    base: vi.fn().mockResolvedValue("/mock/data/dir/"),
  },
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  exists: vi.fn().mockResolvedValue(true),
  mkdir: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@hypr/plugin-export", () => ({
  commands: {
    exportTiptapJsonToMdBatch: vi
      .fn()
      .mockResolvedValue({ status: "ok", data: null }),
  },
}));

function createTestStore() {
  return createMergeableStore()
    .setTablesSchema(SCHEMA.table)
    .setValuesSchema(SCHEMA.value);
}

describe("createNotePersister", () => {
  let store: ReturnType<typeof createTestStore>;
  let handleSyncToSession: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    store = createTestStore();
    handleSyncToSession = vi.fn();
    vi.clearAllMocks();
  });

  test("returns a persister object with expected methods", () => {
    const persister = createNotePersister<Schemas>(store, handleSyncToSession);

    expect(persister).toBeDefined();
    expect(persister.save).toBeTypeOf("function");
    expect(persister.load).toBeTypeOf("function");
    expect(persister.destroy).toBeTypeOf("function");
  });

  test("load returns undefined (no-op)", async () => {
    const persister = createNotePersister<Schemas>(store, handleSyncToSession);

    const result = await persister.load();
    expect(result).toBe(persister);
    expect(handleSyncToSession).not.toHaveBeenCalled();
  });

  describe("save", () => {
    test("exports enhanced_note to markdown file", async () => {
      const { commands } = await import("@hypr/plugin-export");

      const noteId = "note-1";
      store.setRow("enhanced_notes", noteId, {
        user_id: "user-1",
        created_at: new Date().toISOString(),
        session_id: "session-1",
        content: '{"type":"doc","content":[{"type":"paragraph"}]}',
        template_id: "template-1",
        position: 0,
      });
      store.setRow("templates", "template-1", {
        user_id: "user-1",
        created_at: new Date().toISOString(),
        title: "My Template",
        description: "",
        sections: "[]",
      });

      const persister = createNotePersister<Schemas>(
        store,
        handleSyncToSession,
      );

      await persister.save();

      expect(commands.exportTiptapJsonToMdBatch).toHaveBeenCalledTimes(1);
      expect(commands.exportTiptapJsonToMdBatch).toHaveBeenCalledWith([
        [
          { type: "doc", content: [{ type: "paragraph" }] },
          "/mock/data/dir/hyprnote/sessions/session-1/My Template.md",
        ],
      ]);
    });

    test("uses _summary.md when no template_id", async () => {
      const { commands } = await import("@hypr/plugin-export");

      store.setRow("enhanced_notes", "note-1", {
        user_id: "user-1",
        created_at: new Date().toISOString(),
        session_id: "session-1",
        content: '{"type":"doc","content":[{"type":"paragraph"}]}',
        position: 0,
      });

      const persister = createNotePersister<Schemas>(
        store,
        handleSyncToSession,
      );

      await persister.save();

      expect(commands.exportTiptapJsonToMdBatch).toHaveBeenCalledWith([
        [
          { type: "doc", content: [{ type: "paragraph" }] },
          "/mock/data/dir/hyprnote/sessions/session-1/_summary.md",
        ],
      ]);
    });

    test("calls handleSyncToSession when no template_id but has session_id", async () => {
      store.setRow("enhanced_notes", "note-1", {
        user_id: "user-1",
        created_at: new Date().toISOString(),
        session_id: "session-1",
        content: '{"type":"doc","content":[{"type":"paragraph"}]}',
        position: 0,
      });

      const persister = createNotePersister<Schemas>(
        store,
        handleSyncToSession,
      );

      await persister.save();

      expect(handleSyncToSession).toHaveBeenCalledTimes(1);
      expect(handleSyncToSession).toHaveBeenCalledWith(
        "session-1",
        '{"type":"doc","content":[{"type":"paragraph"}]}',
      );
    });

    test("does not call handleSyncToSession when has template_id", async () => {
      store.setRow("enhanced_notes", "note-1", {
        user_id: "user-1",
        created_at: new Date().toISOString(),
        session_id: "session-1",
        content: '{"type":"doc","content":[{"type":"paragraph"}]}',
        template_id: "template-1",
        position: 0,
      });
      store.setRow("templates", "template-1", {
        user_id: "user-1",
        created_at: new Date().toISOString(),
        title: "Template",
        description: "",
        sections: "[]",
      });

      const persister = createNotePersister<Schemas>(
        store,
        handleSyncToSession,
      );

      await persister.save();

      expect(handleSyncToSession).not.toHaveBeenCalled();
    });

    test("sanitizes template title for filename", async () => {
      const { commands } = await import("@hypr/plugin-export");

      store.setRow("enhanced_notes", "note-1", {
        user_id: "user-1",
        created_at: new Date().toISOString(),
        session_id: "session-1",
        content: '{"type":"doc","content":[{"type":"paragraph"}]}',
        template_id: "template-1",
        position: 0,
      });
      store.setRow("templates", "template-1", {
        user_id: "user-1",
        created_at: new Date().toISOString(),
        title: 'My<>:"/\\|?*Template',
        description: "",
        sections: "[]",
      });

      const persister = createNotePersister<Schemas>(
        store,
        handleSyncToSession,
      );

      await persister.save();

      expect(commands.exportTiptapJsonToMdBatch).toHaveBeenCalledWith([
        [
          expect.any(Object),
          "/mock/data/dir/hyprnote/sessions/session-1/My_________Template.md",
        ],
      ]);
    });

    test("falls back to template_id when template title is not found", async () => {
      const { commands } = await import("@hypr/plugin-export");

      store.setRow("enhanced_notes", "note-1", {
        user_id: "user-1",
        created_at: new Date().toISOString(),
        session_id: "session-1",
        content: '{"type":"doc","content":[{"type":"paragraph"}]}',
        template_id: "unknown-template-id",
        position: 0,
      });

      const persister = createNotePersister<Schemas>(
        store,
        handleSyncToSession,
      );

      await persister.save();

      expect(commands.exportTiptapJsonToMdBatch).toHaveBeenCalledWith([
        [
          expect.any(Object),
          "/mock/data/dir/hyprnote/sessions/session-1/unknown-template-id.md",
        ],
      ]);
    });

    test("handles multiple enhanced_notes", async () => {
      const { commands } = await import("@hypr/plugin-export");

      store.setRow("enhanced_notes", "note-1", {
        user_id: "user-1",
        created_at: new Date().toISOString(),
        session_id: "session-1",
        content: '{"type":"doc","content":[{"type":"paragraph"}]}',
        position: 0,
      });
      store.setRow("enhanced_notes", "note-2", {
        user_id: "user-1",
        created_at: new Date().toISOString(),
        session_id: "session-1",
        content: '{"type":"doc","content":[{"type":"paragraph"}]}',
        template_id: "template-1",
        position: 1,
      });
      store.setRow("templates", "template-1", {
        user_id: "user-1",
        created_at: new Date().toISOString(),
        title: "Template",
        description: "",
        sections: "[]",
      });

      const persister = createNotePersister<Schemas>(
        store,
        handleSyncToSession,
      );

      await persister.save();

      expect(commands.exportTiptapJsonToMdBatch).toHaveBeenCalledTimes(1);
      const callArgs = vi.mocked(commands.exportTiptapJsonToMdBatch).mock
        .calls[0][0];
      expect(callArgs).toHaveLength(2);
      expect(handleSyncToSession).toHaveBeenCalledTimes(1);
    });

    test("exports raw_md for sessions", async () => {
      const { commands } = await import("@hypr/plugin-export");

      store.setRow("sessions", "session-1", {
        user_id: "user-1",
        created_at: new Date().toISOString(),
        title: "Test Session",
        raw_md: '{"type":"doc","content":[{"type":"paragraph"}]}',
        enhanced_md: "",
      });

      const persister = createNotePersister<Schemas>(
        store,
        handleSyncToSession,
      );

      await persister.save();

      expect(commands.exportTiptapJsonToMdBatch).toHaveBeenCalledWith([
        [
          { type: "doc", content: [{ type: "paragraph" }] },
          "/mock/data/dir/hyprnote/sessions/session-1/_memo.md",
        ],
      ]);
    });

    test("does not export raw_md when raw_md is empty", async () => {
      const { commands } = await import("@hypr/plugin-export");

      store.setRow("sessions", "session-1", {
        user_id: "user-1",
        created_at: new Date().toISOString(),
        title: "Test Session",
        raw_md: "",
        enhanced_md: "",
      });

      const persister = createNotePersister<Schemas>(
        store,
        handleSyncToSession,
      );

      await persister.save();

      expect(commands.exportTiptapJsonToMdBatch).not.toHaveBeenCalled();
    });

    test("creates directory if it does not exist", async () => {
      const { exists, mkdir } = await import("@tauri-apps/plugin-fs");
      vi.mocked(exists).mockResolvedValue(false);

      store.setRow("enhanced_notes", "note-1", {
        user_id: "user-1",
        created_at: new Date().toISOString(),
        session_id: "session-1",
        content: '{"type":"doc","content":[{"type":"paragraph"}]}',
        position: 0,
      });

      const persister = createNotePersister<Schemas>(
        store,
        handleSyncToSession,
      );

      await persister.save();

      expect(mkdir).toHaveBeenCalledWith(
        "/mock/data/dir/hyprnote/sessions/session-1",
        { recursive: true },
      );
    });

    test("skips when content is not valid tiptap json", async () => {
      const { commands } = await import("@hypr/plugin-export");

      store.setRow("enhanced_notes", "note-1", {
        user_id: "user-1",
        created_at: new Date().toISOString(),
        session_id: "session-1",
        content: "not valid json",
        position: 0,
      });

      const persister = createNotePersister<Schemas>(
        store,
        handleSyncToSession,
      );

      await persister.save();

      expect(commands.exportTiptapJsonToMdBatch).not.toHaveBeenCalled();
    });
  });
});
