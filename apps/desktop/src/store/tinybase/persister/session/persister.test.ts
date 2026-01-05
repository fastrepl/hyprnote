import { createMergeableStore } from "tinybase/with-schemas";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { SCHEMA, type Schemas } from "@hypr/store";

import { collectSessionMeta, type SessionMetaJson } from "./collect";
import { createSessionPersister } from "./persister";

vi.mock("@hypr/plugin-path2", () => ({
  commands: {
    base: vi.fn().mockResolvedValue("/mock/data/dir/hyprnote"),
  },
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  readDir: vi.fn(),
  readTextFile: vi.fn(),
  mkdir: vi.fn().mockResolvedValue(undefined),
  exists: vi.fn().mockResolvedValue(true),
  remove: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@hypr/plugin-fs-sync", () => ({
  commands: {
    writeJsonBatch: vi.fn().mockResolvedValue({ status: "ok", data: null }),
    cleanupOrphanDirs: vi
      .fn()
      .mockResolvedValue({ status: "ok", data: 0 }),
  },
}));

function createTestStore() {
  return createMergeableStore()
    .setTablesSchema(SCHEMA.table)
    .setValuesSchema(SCHEMA.value);
}

describe("collectSessionMeta", () => {
  test("collects session metadata without tags", () => {
    const store = createTestStore();

    store.setRow("sessions", "session-1", {
      user_id: "user-1",
      created_at: "2024-01-01T00:00:00Z",
      title: "Test Session",
      raw_md: "",
    });

    const result = collectSessionMeta(store);

    expect(result.size).toBe(1);
    const entry = result.get("session-1");
    expect(entry?.meta).toEqual({
      id: "session-1",
      user_id: "user-1",
      created_at: "2024-01-01T00:00:00Z",
      title: "Test Session",
      event_id: undefined,
      participants: [],
      tags: undefined,
    });
    expect(entry?.folderPath).toBe("");
  });

  test("collects session metadata with tags", () => {
    const store = createTestStore();

    store.setRow("sessions", "session-1", {
      user_id: "user-1",
      created_at: "2024-01-01T00:00:00Z",
      title: "Test Session",
      raw_md: "",
    });

    store.setRow("tags", "Important", {
      user_id: "user-1",
      created_at: "2024-01-01T00:00:00Z",
      name: "Important",
    });

    store.setRow("tags", "Meeting", {
      user_id: "user-1",
      created_at: "2024-01-01T00:00:00Z",
      name: "Meeting",
    });

    store.setRow("mapping_tag_session", "session-1:Important", {
      user_id: "user-1",
      created_at: "2024-01-01T00:00:00Z",
      tag_id: "Important",
      session_id: "session-1",
    });

    store.setRow("mapping_tag_session", "session-1:Meeting", {
      user_id: "user-1",
      created_at: "2024-01-01T00:00:00Z",
      tag_id: "Meeting",
      session_id: "session-1",
    });

    const result = collectSessionMeta(store);

    expect(result.size).toBe(1);
    const entry = result.get("session-1");
    expect(entry?.meta.tags).toBeDefined();
    expect(entry?.meta.tags).toHaveLength(2);
    expect(entry?.meta.tags).toContain("Important");
    expect(entry?.meta.tags).toContain("Meeting");
  });

  test("handles sessions with and without tags", () => {
    const store = createTestStore();

    store.setRow("sessions", "session-1", {
      user_id: "user-1",
      created_at: "2024-01-01T00:00:00Z",
      title: "Session With Tags",
      raw_md: "",
    });

    store.setRow("sessions", "session-2", {
      user_id: "user-1",
      created_at: "2024-01-02T00:00:00Z",
      title: "Session Without Tags",
      raw_md: "",
    });

    store.setRow("tags", "Important", {
      user_id: "user-1",
      created_at: "2024-01-01T00:00:00Z",
      name: "Important",
    });

    store.setRow("mapping_tag_session", "session-1:Important", {
      user_id: "user-1",
      created_at: "2024-01-01T00:00:00Z",
      tag_id: "Important",
      session_id: "session-1",
    });

    const result = collectSessionMeta(store);

    expect(result.size).toBe(2);

    const entry1 = result.get("session-1");
    expect(entry1?.meta.tags).toEqual(["Important"]);

    const entry2 = result.get("session-2");
    expect(entry2?.meta.tags).toBeUndefined();
  });

  test("includes participants with tags", () => {
    const store = createTestStore();

    store.setRow("sessions", "session-1", {
      user_id: "user-1",
      created_at: "2024-01-01T00:00:00Z",
      title: "Test Session",
      raw_md: "",
    });

    store.setRow("mapping_session_participant", "mapping-1", {
      user_id: "user-1",
      created_at: "2024-01-01T00:00:00Z",
      session_id: "session-1",
      human_id: "human-1",
      source: "manual",
    });

    store.setRow("tags", "Important", {
      user_id: "user-1",
      created_at: "2024-01-01T00:00:00Z",
      name: "Important",
    });

    store.setRow("mapping_tag_session", "session-1:Important", {
      user_id: "user-1",
      created_at: "2024-01-01T00:00:00Z",
      tag_id: "Important",
      session_id: "session-1",
    });

    const result = collectSessionMeta(store);
    const entry = result.get("session-1");

    expect(entry?.meta.participants).toHaveLength(1);
    expect(entry?.meta.participants[0].id).toBe("mapping-1");
    expect(entry?.meta.tags).toEqual(["Important"]);
  });
});

describe("createSessionPersister", () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
    vi.clearAllMocks();
  });

  test("returns a persister object with expected methods", () => {
    const persister = createSessionPersister<Schemas>(store);

    expect(persister).toBeDefined();
    expect(persister.save).toBeTypeOf("function");
    expect(persister.load).toBeTypeOf("function");
    expect(persister.destroy).toBeTypeOf("function");
  });

  describe("load", () => {
    test("loads sessions with tags from meta files", async () => {
      const { readDir, readTextFile } = await import("@tauri-apps/plugin-fs");

      vi.mocked(readDir).mockResolvedValue([
        {
          name: "session-1",
          isDirectory: true,
          isFile: false,
          isSymlink: false,
        },
      ]);

      const mockMeta: SessionMetaJson = {
        id: "session-1",
        user_id: "user-1",
        created_at: "2024-01-01T00:00:00Z",
        title: "Test Session",
        participants: [],
        tags: ["Important", "Meeting"],
      };
      vi.mocked(readTextFile).mockResolvedValue(JSON.stringify(mockMeta));

      const persister = createSessionPersister<Schemas>(store);
      await persister.load();

      expect(store.getTable("sessions")).toEqual({
        "session-1": {
          user_id: "user-1",
          created_at: "2024-01-01T00:00:00Z",
          title: "Test Session",
          folder_id: "",
          event_id: undefined,
          raw_md: "",
        },
      });

      const tags = store.getTable("tags");
      expect(tags["Important"]).toBeDefined();
      expect(tags["Important"].name).toBe("Important");
      expect(tags["Meeting"]).toBeDefined();
      expect(tags["Meeting"].name).toBe("Meeting");

      const mappings = store.getTable("mapping_tag_session");
      expect(mappings["session-1:Important"]).toBeDefined();
      expect(mappings["session-1:Important"].tag_id).toBe("Important");
      expect(mappings["session-1:Important"].session_id).toBe("session-1");
      expect(mappings["session-1:Meeting"]).toBeDefined();
    });

    test("handles sessions without tags", async () => {
      const { readDir, readTextFile } = await import("@tauri-apps/plugin-fs");

      vi.mocked(readDir).mockResolvedValue([
        {
          name: "session-1",
          isDirectory: true,
          isFile: false,
          isSymlink: false,
        },
      ]);

      const mockMeta: SessionMetaJson = {
        id: "session-1",
        user_id: "user-1",
        created_at: "2024-01-01T00:00:00Z",
        title: "Test Session",
        participants: [],
      };
      vi.mocked(readTextFile).mockResolvedValue(JSON.stringify(mockMeta));

      const persister = createSessionPersister<Schemas>(store);
      await persister.load();

      expect(store.getTable("tags")).toEqual({});
      expect(store.getTable("mapping_tag_session")).toEqual({});
    });

    test("deduplicates tags across sessions", async () => {
      const { readDir, readTextFile } = await import("@tauri-apps/plugin-fs");

      vi.mocked(readDir).mockResolvedValue([
        {
          name: "session-1",
          isDirectory: true,
          isFile: false,
          isSymlink: false,
        },
        {
          name: "session-2",
          isDirectory: true,
          isFile: false,
          isSymlink: false,
        },
      ]);

      vi.mocked(readTextFile)
        .mockResolvedValueOnce(
          JSON.stringify({
            id: "session-1",
            user_id: "user-1",
            created_at: "2024-01-01T00:00:00Z",
            title: "Session 1",
            participants: [],
            tags: ["Important"],
          }),
        )
        .mockResolvedValueOnce(
          JSON.stringify({
            id: "session-2",
            user_id: "user-1",
            created_at: "2024-01-02T00:00:00Z",
            title: "Session 2",
            participants: [],
            tags: ["Important"],
          }),
        );

      const persister = createSessionPersister<Schemas>(store);
      await persister.load();

      const tags = store.getTable("tags");
      expect(Object.keys(tags)).toHaveLength(1);
      expect(tags["Important"].name).toBe("Important");

      const mappings = store.getTable("mapping_tag_session");
      expect(Object.keys(mappings)).toHaveLength(2);
      expect(mappings["session-1:Important"]).toBeDefined();
      expect(mappings["session-2:Important"]).toBeDefined();
    });
  });

  describe("save", () => {
    test("saves session metadata with tags to files", async () => {
      const { commands } = await import("@hypr/plugin-fs-sync");

      store.setRow("sessions", "session-1", {
        user_id: "user-1",
        created_at: "2024-01-01T00:00:00Z",
        title: "Test Session",
        raw_md: "",
      });

      store.setRow("tags", "Important", {
        user_id: "user-1",
        created_at: "2024-01-01T00:00:00Z",
        name: "Important",
      });

      store.setRow("mapping_tag_session", "session-1:Important", {
        user_id: "user-1",
        created_at: "2024-01-01T00:00:00Z",
        tag_id: "Important",
        session_id: "session-1",
      });

      const persister = createSessionPersister<Schemas>(store);
      await persister.save();

      expect(commands.writeJsonBatch).toHaveBeenCalled();
      const batchItems = vi.mocked(commands.writeJsonBatch).mock.calls[0][0];
      const content = batchItems[0][0] as SessionMetaJson;

      expect(content.tags).toEqual(["Important"]);
    });
  });
});
