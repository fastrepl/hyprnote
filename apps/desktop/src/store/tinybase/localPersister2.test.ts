import { createMergeableStore } from "tinybase/with-schemas";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { SCHEMA, type Schemas } from "@hypr/store";

import { createLocalPersister2 } from "./localPersister2";

function createTestStore() {
  return createMergeableStore()
    .setTablesSchema(SCHEMA.table)
    .setValuesSchema(SCHEMA.value);
}

describe("createLocalPersister2", () => {
  let store: ReturnType<typeof createTestStore>;
  let handlePersistEnhancedNote: ReturnType<typeof vi.fn>;
  let handleSyncToSession: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    store = createTestStore();
    handlePersistEnhancedNote = vi.fn().mockResolvedValue(undefined);
    handleSyncToSession = vi.fn();
  });

  test("returns a persister object with expected methods", () => {
    const persister = createLocalPersister2<Schemas>(
      store,
      handlePersistEnhancedNote,
      handleSyncToSession,
    );

    expect(persister).toBeDefined();
    expect(persister.save).toBeTypeOf("function");
    expect(persister.load).toBeTypeOf("function");
    expect(persister.destroy).toBeTypeOf("function");
  });

  test("load returns undefined (no-op)", async () => {
    const persister = createLocalPersister2<Schemas>(
      store,
      handlePersistEnhancedNote,
      handleSyncToSession,
    );

    const result = await persister.load();
    expect(result).toBe(persister);
    expect(handlePersistEnhancedNote).not.toHaveBeenCalled();
    expect(handleSyncToSession).not.toHaveBeenCalled();
  });

  describe("save", () => {
    test("calls handlePersistEnhancedNote for each enhanced_note", async () => {
      const noteId = "note-1";
      store.setRow("enhanced_notes", noteId, {
        user_id: "user-1",
        created_at: new Date().toISOString(),
        session_id: "session-1",
        content: "test content",
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

      const persister = createLocalPersister2<Schemas>(
        store,
        handlePersistEnhancedNote,
        handleSyncToSession,
      );

      await persister.save();

      expect(handlePersistEnhancedNote).toHaveBeenCalledTimes(1);
      expect(handlePersistEnhancedNote).toHaveBeenCalledWith(
        expect.objectContaining({
          id: noteId,
          user_id: "user-1",
          session_id: "session-1",
          content: "test content",
          template_id: "template-1",
        }),
        "My Template.md",
      );
    });

    test("uses _summary.md when no template_id", async () => {
      store.setRow("enhanced_notes", "note-1", {
        user_id: "user-1",
        created_at: new Date().toISOString(),
        session_id: "session-1",
        content: "summary content",
        position: 0,
      });

      const persister = createLocalPersister2<Schemas>(
        store,
        handlePersistEnhancedNote,
        handleSyncToSession,
      );

      await persister.save();

      expect(handlePersistEnhancedNote).toHaveBeenCalledWith(
        expect.objectContaining({ id: "note-1" }),
        "_summary.md",
      );
    });

    test("calls handleSyncToSession when no template_id but has session_id", async () => {
      store.setRow("enhanced_notes", "note-1", {
        user_id: "user-1",
        created_at: new Date().toISOString(),
        session_id: "session-1",
        content: "sync content",
        position: 0,
      });

      const persister = createLocalPersister2<Schemas>(
        store,
        handlePersistEnhancedNote,
        handleSyncToSession,
      );

      await persister.save();

      expect(handleSyncToSession).toHaveBeenCalledTimes(1);
      expect(handleSyncToSession).toHaveBeenCalledWith(
        "session-1",
        "sync content",
      );
    });

    test("does not call handleSyncToSession when has template_id", async () => {
      store.setRow("enhanced_notes", "note-1", {
        user_id: "user-1",
        created_at: new Date().toISOString(),
        session_id: "session-1",
        content: "template content",
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

      const persister = createLocalPersister2<Schemas>(
        store,
        handlePersistEnhancedNote,
        handleSyncToSession,
      );

      await persister.save();

      expect(handleSyncToSession).not.toHaveBeenCalled();
    });

    test("sanitizes template title for filename", async () => {
      store.setRow("enhanced_notes", "note-1", {
        user_id: "user-1",
        created_at: new Date().toISOString(),
        session_id: "session-1",
        content: "content",
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

      const persister = createLocalPersister2<Schemas>(
        store,
        handlePersistEnhancedNote,
        handleSyncToSession,
      );

      await persister.save();

      expect(handlePersistEnhancedNote).toHaveBeenCalledWith(
        expect.anything(),
        "My_________Template.md",
      );
    });

    test("falls back to template_id when template title is not found", async () => {
      store.setRow("enhanced_notes", "note-1", {
        user_id: "user-1",
        created_at: new Date().toISOString(),
        session_id: "session-1",
        content: "content",
        template_id: "unknown-template-id",
        position: 0,
      });

      const persister = createLocalPersister2<Schemas>(
        store,
        handlePersistEnhancedNote,
        handleSyncToSession,
      );

      await persister.save();

      expect(handlePersistEnhancedNote).toHaveBeenCalledWith(
        expect.anything(),
        "unknown-template-id.md",
      );
    });

    test("handles multiple enhanced_notes", async () => {
      store.setRow("enhanced_notes", "note-1", {
        user_id: "user-1",
        created_at: new Date().toISOString(),
        session_id: "session-1",
        content: "content 1",
        position: 0,
      });
      store.setRow("enhanced_notes", "note-2", {
        user_id: "user-1",
        created_at: new Date().toISOString(),
        session_id: "session-1",
        content: "content 2",
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

      const persister = createLocalPersister2<Schemas>(
        store,
        handlePersistEnhancedNote,
        handleSyncToSession,
      );

      await persister.save();

      expect(handlePersistEnhancedNote).toHaveBeenCalledTimes(2);
      expect(handleSyncToSession).toHaveBeenCalledTimes(1);
    });
  });
});
