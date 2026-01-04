import { createMergeableStore } from "tinybase/with-schemas";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { SCHEMA, type Schemas } from "@hypr/store";

import { createNotePersister } from "./persister";

vi.mock("@hypr/plugin-path2", () => ({
  commands: {
    base: vi.fn().mockResolvedValue("/mock/data/dir/hyprnote"),
  },
}));

vi.mock("@tauri-apps/api/path", () => ({
  sep: vi.fn().mockReturnValue("/"),
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  exists: vi.fn().mockResolvedValue(true),
  mkdir: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@hypr/plugin-frontmatter", () => ({
  commands: {
    serializeBatch: vi.fn().mockResolvedValue({ status: "ok", data: null }),
  },
}));

vi.mock("@hypr/tiptap/shared", () => ({
  isValidTiptapContent: vi.fn((content: unknown) => {
    if (!content || typeof content !== "object") {
      return false;
    }
    const obj = content as Record<string, unknown>;
    return obj.type === "doc" && Array.isArray(obj.content);
  }),
  json2md: vi.fn().mockReturnValue("mock markdown content"),
}));

function createTestStore() {
  return createMergeableStore()
    .setTablesSchema(SCHEMA.table)
    .setValuesSchema(SCHEMA.value);
}

describe("createNotePersister", () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
    vi.clearAllMocks();
  });

  test("returns a persister object with expected methods", () => {
    const persister = createNotePersister<Schemas>(store);

    expect(persister).toBeDefined();
    expect(persister.save).toBeTypeOf("function");
    expect(persister.load).toBeTypeOf("function");
    expect(persister.destroy).toBeTypeOf("function");
  });

  test("load returns undefined (no-op)", async () => {
    const persister = createNotePersister<Schemas>(store);

    const result = await persister.load();
    expect(result).toBe(persister);
  });

  describe("save", () => {
    test("exports enhanced_note to markdown file", async () => {
      const { commands: frontmatterCommands } =
        await import("@hypr/plugin-frontmatter");

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

      const persister = createNotePersister<Schemas>(store);

      await persister.save();

      expect(frontmatterCommands.serializeBatch).toHaveBeenCalledTimes(1);
      expect(frontmatterCommands.serializeBatch).toHaveBeenCalledWith([
        [
          {
            frontmatter: {
              id: noteId,
              session_id: "session-1",
              type: "enhanced_note",
              template_id: "template-1",
              position: 0,
              title: undefined,
            },
            content: "mock markdown content",
          },
          "/mock/data/dir/hyprnote/sessions/session-1/My Template.md",
        ],
      ]);
    });

    test("uses _summary.md when no template_id", async () => {
      const { commands: frontmatterCommands } =
        await import("@hypr/plugin-frontmatter");

      store.setRow("enhanced_notes", "note-1", {
        user_id: "user-1",
        created_at: new Date().toISOString(),
        session_id: "session-1",
        content: '{"type":"doc","content":[{"type":"paragraph"}]}',
        position: 0,
      });

      const persister = createNotePersister<Schemas>(store);

      await persister.save();

      expect(frontmatterCommands.serializeBatch).toHaveBeenCalledWith([
        [
          {
            frontmatter: {
              id: "note-1",
              session_id: "session-1",
              type: "enhanced_note",
              template_id: undefined,
              position: 0,
              title: undefined,
            },
            content: "mock markdown content",
          },
          "/mock/data/dir/hyprnote/sessions/session-1/_summary.md",
        ],
      ]);
    });

    test("sanitizes template title for filename", async () => {
      const { commands: frontmatterCommands } =
        await import("@hypr/plugin-frontmatter");

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

      const persister = createNotePersister<Schemas>(store);

      await persister.save();

      expect(frontmatterCommands.serializeBatch).toHaveBeenCalledWith([
        [
          expect.any(Object),
          "/mock/data/dir/hyprnote/sessions/session-1/My_________Template.md",
        ],
      ]);
    });

    test("falls back to template_id when template title is not found", async () => {
      const { commands: frontmatterCommands } =
        await import("@hypr/plugin-frontmatter");

      store.setRow("enhanced_notes", "note-1", {
        user_id: "user-1",
        created_at: new Date().toISOString(),
        session_id: "session-1",
        content: '{"type":"doc","content":[{"type":"paragraph"}]}',
        template_id: "unknown-template-id",
        position: 0,
      });

      const persister = createNotePersister<Schemas>(store);

      await persister.save();

      expect(frontmatterCommands.serializeBatch).toHaveBeenCalledWith([
        [
          expect.any(Object),
          "/mock/data/dir/hyprnote/sessions/session-1/unknown-template-id.md",
        ],
      ]);
    });

    test("handles multiple enhanced_notes", async () => {
      const { commands: frontmatterCommands } =
        await import("@hypr/plugin-frontmatter");

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

      const persister = createNotePersister<Schemas>(store);

      await persister.save();

      expect(frontmatterCommands.serializeBatch).toHaveBeenCalledTimes(1);
      const callArgs = vi.mocked(frontmatterCommands.serializeBatch).mock
        .calls[0][0];
      expect(callArgs).toHaveLength(2);
    });

    test("exports raw_md for sessions", async () => {
      const { commands: frontmatterCommands } =
        await import("@hypr/plugin-frontmatter");

      store.setRow("sessions", "session-1", {
        user_id: "user-1",
        created_at: new Date().toISOString(),
        title: "Test Session",
        raw_md: '{"type":"doc","content":[{"type":"paragraph"}]}',
      });

      const persister = createNotePersister<Schemas>(store);

      await persister.save();

      expect(frontmatterCommands.serializeBatch).toHaveBeenCalledWith([
        [
          {
            frontmatter: {
              id: "session-1",
              session_id: "session-1",
              type: "memo",
            },
            content: "mock markdown content",
          },
          "/mock/data/dir/hyprnote/sessions/session-1/_memo.md",
        ],
      ]);
    });

    test("does not export raw_md when raw_md is empty", async () => {
      const { commands: frontmatterCommands } =
        await import("@hypr/plugin-frontmatter");

      store.setRow("sessions", "session-1", {
        user_id: "user-1",
        created_at: new Date().toISOString(),
        title: "Test Session",
        raw_md: "",
      });

      const persister = createNotePersister<Schemas>(store);

      await persister.save();

      expect(frontmatterCommands.serializeBatch).not.toHaveBeenCalled();
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

      const persister = createNotePersister<Schemas>(store);

      await persister.save();

      expect(mkdir).toHaveBeenCalledWith(
        "/mock/data/dir/hyprnote/sessions/session-1",
        { recursive: true },
      );
    });

    test("skips when content is not valid tiptap json", async () => {
      const { commands: frontmatterCommands } =
        await import("@hypr/plugin-frontmatter");

      store.setRow("enhanced_notes", "note-1", {
        user_id: "user-1",
        created_at: new Date().toISOString(),
        session_id: "session-1",
        content: "not valid json",
        position: 0,
      });

      const persister = createNotePersister<Schemas>(store);

      await persister.save();

      expect(frontmatterCommands.serializeBatch).not.toHaveBeenCalled();
    });
  });
});
