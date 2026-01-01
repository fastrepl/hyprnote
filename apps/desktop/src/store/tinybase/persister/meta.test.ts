import { createMergeableStore } from "tinybase/with-schemas";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { SCHEMA, type Schemas } from "@hypr/store";

import {
  collectSessionMeta,
  createMetaPersister,
  type SessionMetaJson,
} from "./meta";
import type { TablesContent } from "./utils";

vi.mock("@hypr/plugin-path2", () => ({
  commands: {
    base: vi.fn().mockResolvedValue("/mock/data/dir/hyprnote"),
  },
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeTextFile: vi.fn().mockResolvedValue(undefined),
}));

function createTestStore() {
  return createMergeableStore()
    .setTablesSchema(SCHEMA.table)
    .setValuesSchema(SCHEMA.value);
}

describe("collectSessionMeta", () => {
  test("returns empty map when tables is undefined", () => {
    const result = collectSessionMeta(undefined);
    expect(result.size).toBe(0);
  });

  test("returns empty map when no sessions exist", () => {
    const tables: TablesContent = {};
    const result = collectSessionMeta(tables);
    expect(result.size).toBe(0);
  });

  test("collects basic session meta", () => {
    const tables: TablesContent = {
      sessions: {
        "session-1": {
          user_id: "user-1",
          created_at: "2024-01-01T00:00:00Z",
          title: "Meeting Notes",
          folder_id: "",
          event_id: "",
          raw_md: "",
          enhanced_md: "",
        },
      },
    };

    const result = collectSessionMeta(tables);

    expect(result.size).toBe(1);
    const meta = result.get("session-1");
    expect(meta).toMatchObject({
      id: "session-1",
      title: "Meeting Notes",
      created_at: "2024-01-01T00:00:00Z",
      participants: [],
      tags: [],
    });
  });

  test("collects session with folder_id", () => {
    const tables: TablesContent = {
      sessions: {
        "session-1": {
          user_id: "user-1",
          created_at: "2024-01-01T00:00:00Z",
          title: "Meeting Notes",
          folder_id: "folder-1",
          event_id: "",
          raw_md: "",
          enhanced_md: "",
        },
      },
    };

    const result = collectSessionMeta(tables);
    const meta = result.get("session-1");

    expect(meta?.folder_id).toBe("folder-1");
  });

  test("collects participants with human and org data", () => {
    const tables: TablesContent = {
      sessions: {
        "session-1": {
          user_id: "user-1",
          created_at: "2024-01-01T00:00:00Z",
          title: "Meeting Notes",
          folder_id: "",
          event_id: "",
          raw_md: "",
          enhanced_md: "",
        },
      },
      humans: {
        "human-1": {
          user_id: "user-1",
          created_at: "2024-01-01T00:00:00Z",
          name: "John Doe",
          email: "john@example.com",
          org_id: "org-1",
          job_title: "Engineer",
          linkedin_username: "",
          memo: "",
        },
      },
      organizations: {
        "org-1": {
          user_id: "user-1",
          created_at: "2024-01-01T00:00:00Z",
          name: "Acme Corp",
        },
      },
      mapping_session_participant: {
        "mapping-1": {
          user_id: "user-1",
          created_at: "2024-01-01T00:00:00Z",
          session_id: "session-1",
          human_id: "human-1",
          source: "manual",
        },
      },
    };

    const result = collectSessionMeta(tables);
    const meta = result.get("session-1");

    expect(meta?.participants).toHaveLength(1);
    expect(meta?.participants[0]).toEqual({
      human_id: "human-1",
      name: "John Doe",
      email: "john@example.com",
      org_name: "Acme Corp",
      job_title: "Engineer",
      source: "manual",
    });
  });

  test("collects participant without org", () => {
    const tables: TablesContent = {
      sessions: {
        "session-1": {
          user_id: "user-1",
          created_at: "2024-01-01T00:00:00Z",
          title: "Meeting",
          folder_id: "",
          event_id: "",
          raw_md: "",
          enhanced_md: "",
        },
      },
      humans: {
        "human-1": {
          user_id: "user-1",
          created_at: "2024-01-01T00:00:00Z",
          name: "Jane Doe",
          email: "jane@example.com",
          org_id: "",
          job_title: "",
          linkedin_username: "",
          memo: "",
        },
      },
      mapping_session_participant: {
        "mapping-1": {
          user_id: "user-1",
          created_at: "2024-01-01T00:00:00Z",
          session_id: "session-1",
          human_id: "human-1",
          source: "",
        },
      },
    };

    const result = collectSessionMeta(tables);
    const meta = result.get("session-1");

    expect(meta?.participants).toHaveLength(1);
    expect(meta?.participants[0]).toEqual({
      human_id: "human-1",
      name: "Jane Doe",
      email: "jane@example.com",
    });
    expect(meta?.participants[0].org_name).toBeUndefined();
  });

  test("collects tags", () => {
    const tables: TablesContent = {
      sessions: {
        "session-1": {
          user_id: "user-1",
          created_at: "2024-01-01T00:00:00Z",
          title: "Meeting",
          folder_id: "",
          event_id: "",
          raw_md: "",
          enhanced_md: "",
        },
      },
      tags: {
        "tag-1": {
          user_id: "user-1",
          created_at: "2024-01-01T00:00:00Z",
          name: "Important",
        },
        "tag-2": {
          user_id: "user-1",
          created_at: "2024-01-01T00:00:00Z",
          name: "Follow-up",
        },
      },
      mapping_tag_session: {
        "mapping-1": {
          user_id: "user-1",
          created_at: "2024-01-01T00:00:00Z",
          tag_id: "tag-1",
          session_id: "session-1",
        },
        "mapping-2": {
          user_id: "user-1",
          created_at: "2024-01-01T00:00:00Z",
          tag_id: "tag-2",
          session_id: "session-1",
        },
      },
    };

    const result = collectSessionMeta(tables);
    const meta = result.get("session-1");

    expect(meta?.tags).toHaveLength(2);
    expect(meta?.tags).toContainEqual({ tag_id: "tag-1", name: "Important" });
    expect(meta?.tags).toContainEqual({ tag_id: "tag-2", name: "Follow-up" });
  });

  test("collects event data", () => {
    const tables: TablesContent = {
      sessions: {
        "session-1": {
          user_id: "user-1",
          created_at: "2024-01-01T00:00:00Z",
          title: "Meeting",
          folder_id: "",
          event_id: "event-1",
          raw_md: "",
          enhanced_md: "",
        },
      },
      events: {
        "event-1": {
          user_id: "user-1",
          created_at: "2024-01-01T00:00:00Z",
          tracking_id_event: "track-1",
          calendar_id: "cal-1",
          title: "Weekly Standup",
          started_at: "2024-01-01T09:00:00Z",
          ended_at: "2024-01-01T09:30:00Z",
          location: "Room A",
          meeting_link: "https://meet.example.com/123",
          description: "Weekly team sync",
          note: "",
          ignored: false,
          recurrence_series_id: "",
        },
      },
    };

    const result = collectSessionMeta(tables);
    const meta = result.get("session-1");

    expect(meta?.event_id).toBe("event-1");
    expect(meta?.event).toEqual({
      title: "Weekly Standup",
      started_at: "2024-01-01T09:00:00Z",
      ended_at: "2024-01-01T09:30:00Z",
      location: "Room A",
      meeting_link: "https://meet.example.com/123",
      description: "Weekly team sync",
    });
  });

  test("event without optional fields", () => {
    const tables: TablesContent = {
      sessions: {
        "session-1": {
          user_id: "user-1",
          created_at: "2024-01-01T00:00:00Z",
          title: "Meeting",
          folder_id: "",
          event_id: "event-1",
          raw_md: "",
          enhanced_md: "",
        },
      },
      events: {
        "event-1": {
          user_id: "user-1",
          created_at: "2024-01-01T00:00:00Z",
          tracking_id_event: "track-1",
          calendar_id: "cal-1",
          title: "Quick Call",
          started_at: "2024-01-01T09:00:00Z",
          ended_at: "2024-01-01T09:30:00Z",
          location: "",
          meeting_link: "",
          description: "",
          note: "",
          ignored: false,
          recurrence_series_id: "",
        },
      },
    };

    const result = collectSessionMeta(tables);
    const meta = result.get("session-1");

    expect(meta?.event).toEqual({
      title: "Quick Call",
      started_at: "2024-01-01T09:00:00Z",
      ended_at: "2024-01-01T09:30:00Z",
    });
    expect(meta?.event?.location).toBeUndefined();
    expect(meta?.event?.meeting_link).toBeUndefined();
    expect(meta?.event?.description).toBeUndefined();
  });

  test("skips participant mapping with missing human", () => {
    const tables: TablesContent = {
      sessions: {
        "session-1": {
          user_id: "user-1",
          created_at: "2024-01-01T00:00:00Z",
          title: "Meeting",
          folder_id: "",
          event_id: "",
          raw_md: "",
          enhanced_md: "",
        },
      },
      mapping_session_participant: {
        "mapping-1": {
          user_id: "user-1",
          created_at: "2024-01-01T00:00:00Z",
          session_id: "session-1",
          human_id: "nonexistent-human",
          source: "",
        },
      },
    };

    const result = collectSessionMeta(tables);
    const meta = result.get("session-1");

    expect(meta?.participants).toHaveLength(0);
  });

  test("skips tag mapping with missing tag", () => {
    const tables: TablesContent = {
      sessions: {
        "session-1": {
          user_id: "user-1",
          created_at: "2024-01-01T00:00:00Z",
          title: "Meeting",
          folder_id: "",
          event_id: "",
          raw_md: "",
          enhanced_md: "",
        },
      },
      mapping_tag_session: {
        "mapping-1": {
          user_id: "user-1",
          created_at: "2024-01-01T00:00:00Z",
          tag_id: "nonexistent-tag",
          session_id: "session-1",
        },
      },
    };

    const result = collectSessionMeta(tables);
    const meta = result.get("session-1");

    expect(meta?.tags).toHaveLength(0);
  });

  test("collects multiple sessions", () => {
    const tables: TablesContent = {
      sessions: {
        "session-1": {
          user_id: "user-1",
          created_at: "2024-01-01T00:00:00Z",
          title: "Meeting 1",
          folder_id: "",
          event_id: "",
          raw_md: "",
          enhanced_md: "",
        },
        "session-2": {
          user_id: "user-1",
          created_at: "2024-01-02T00:00:00Z",
          title: "Meeting 2",
          folder_id: "",
          event_id: "",
          raw_md: "",
          enhanced_md: "",
        },
      },
    };

    const result = collectSessionMeta(tables);

    expect(result.size).toBe(2);
    expect(result.get("session-1")?.title).toBe("Meeting 1");
    expect(result.get("session-2")?.title).toBe("Meeting 2");
  });

  test("associates participants with correct sessions", () => {
    const tables: TablesContent = {
      sessions: {
        "session-1": {
          user_id: "user-1",
          created_at: "2024-01-01T00:00:00Z",
          title: "Meeting 1",
          folder_id: "",
          event_id: "",
          raw_md: "",
          enhanced_md: "",
        },
        "session-2": {
          user_id: "user-1",
          created_at: "2024-01-02T00:00:00Z",
          title: "Meeting 2",
          folder_id: "",
          event_id: "",
          raw_md: "",
          enhanced_md: "",
        },
      },
      humans: {
        "human-1": {
          user_id: "user-1",
          created_at: "2024-01-01T00:00:00Z",
          name: "John",
          email: "",
          org_id: "",
          job_title: "",
          linkedin_username: "",
          memo: "",
        },
        "human-2": {
          user_id: "user-1",
          created_at: "2024-01-01T00:00:00Z",
          name: "Jane",
          email: "",
          org_id: "",
          job_title: "",
          linkedin_username: "",
          memo: "",
        },
      },
      mapping_session_participant: {
        "mapping-1": {
          user_id: "user-1",
          created_at: "2024-01-01T00:00:00Z",
          session_id: "session-1",
          human_id: "human-1",
          source: "",
        },
        "mapping-2": {
          user_id: "user-1",
          created_at: "2024-01-01T00:00:00Z",
          session_id: "session-2",
          human_id: "human-2",
          source: "",
        },
      },
    };

    const result = collectSessionMeta(tables);

    expect(result.get("session-1")?.participants).toHaveLength(1);
    expect(result.get("session-1")?.participants[0].name).toBe("John");

    expect(result.get("session-2")?.participants).toHaveLength(1);
    expect(result.get("session-2")?.participants[0].name).toBe("Jane");
  });
});

describe("createMetaPersister", () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
    vi.clearAllMocks();
  });

  test("returns a persister object with expected methods", () => {
    const persister = createMetaPersister<Schemas>(store);

    expect(persister).toBeDefined();
    expect(persister.save).toBeTypeOf("function");
    expect(persister.load).toBeTypeOf("function");
    expect(persister.destroy).toBeTypeOf("function");
  });

  describe("save", () => {
    test("writes _meta.json for each session", async () => {
      const { writeTextFile, mkdir } = await import("@tauri-apps/plugin-fs");

      store.setRow("sessions", "session-1", {
        user_id: "user-1",
        created_at: "2024-01-01T00:00:00Z",
        title: "Meeting Notes",
        folder_id: "",
        event_id: "",
        raw_md: "",
        enhanced_md: "",
      });

      const persister = createMetaPersister<Schemas>(store);
      await persister.save();

      expect(mkdir).toHaveBeenCalledWith(
        "/mock/data/dir/hyprnote/sessions/session-1",
        { recursive: true },
      );

      expect(writeTextFile).toHaveBeenCalledWith(
        "/mock/data/dir/hyprnote/sessions/session-1/_meta.json",
        expect.any(String),
      );

      const writtenContent = vi.mocked(writeTextFile).mock.calls[0][1];
      const parsed = JSON.parse(writtenContent) as SessionMetaJson;

      expect(parsed).toMatchObject({
        id: "session-1",
        title: "Meeting Notes",
        created_at: "2024-01-01T00:00:00Z",
        participants: [],
        tags: [],
      });
    });

    test("does not write when no sessions exist", async () => {
      const { writeTextFile } = await import("@tauri-apps/plugin-fs");

      const persister = createMetaPersister<Schemas>(store);
      await persister.save();

      expect(writeTextFile).not.toHaveBeenCalled();
    });

    test("writes multiple _meta.json files for multiple sessions", async () => {
      const { writeTextFile } = await import("@tauri-apps/plugin-fs");

      store.setRow("sessions", "session-1", {
        user_id: "user-1",
        created_at: "2024-01-01T00:00:00Z",
        title: "Meeting 1",
        folder_id: "",
        event_id: "",
        raw_md: "",
        enhanced_md: "",
      });

      store.setRow("sessions", "session-2", {
        user_id: "user-1",
        created_at: "2024-01-02T00:00:00Z",
        title: "Meeting 2",
        folder_id: "",
        event_id: "",
        raw_md: "",
        enhanced_md: "",
      });

      const persister = createMetaPersister<Schemas>(store);
      await persister.save();

      expect(writeTextFile).toHaveBeenCalledTimes(2);

      const calls = vi.mocked(writeTextFile).mock.calls;
      const paths = calls.map((c) => c[0]);

      expect(paths).toContain(
        "/mock/data/dir/hyprnote/sessions/session-1/_meta.json",
      );
      expect(paths).toContain(
        "/mock/data/dir/hyprnote/sessions/session-2/_meta.json",
      );
    });

    test("includes participants in _meta.json", async () => {
      const { writeTextFile } = await import("@tauri-apps/plugin-fs");

      store.setRow("sessions", "session-1", {
        user_id: "user-1",
        created_at: "2024-01-01T00:00:00Z",
        title: "Meeting",
        folder_id: "",
        event_id: "",
        raw_md: "",
        enhanced_md: "",
      });

      store.setRow("humans", "human-1", {
        user_id: "user-1",
        created_at: "2024-01-01T00:00:00Z",
        name: "John Doe",
        email: "john@example.com",
        org_id: "",
        job_title: "",
        linkedin_username: "",
        memo: "",
      });

      store.setRow("mapping_session_participant", "mapping-1", {
        user_id: "user-1",
        created_at: "2024-01-01T00:00:00Z",
        session_id: "session-1",
        human_id: "human-1",
        source: "manual",
      });

      const persister = createMetaPersister<Schemas>(store);
      await persister.save();

      const writtenContent = vi.mocked(writeTextFile).mock.calls[0][1];
      const parsed = JSON.parse(writtenContent) as SessionMetaJson;

      expect(parsed.participants).toHaveLength(1);
      expect(parsed.participants[0]).toMatchObject({
        human_id: "human-1",
        name: "John Doe",
        email: "john@example.com",
        source: "manual",
      });
    });
  });

  describe("load-only mode", () => {
    test("save is no-op in load-only mode", async () => {
      const { writeTextFile } = await import("@tauri-apps/plugin-fs");

      store.setRow("sessions", "session-1", {
        user_id: "user-1",
        created_at: "2024-01-01T00:00:00Z",
        title: "Meeting",
        folder_id: "",
        event_id: "",
        raw_md: "",
        enhanced_md: "",
      });

      const persister = createMetaPersister<Schemas>(store, {
        mode: "load-only",
      });
      await persister.save();

      expect(writeTextFile).not.toHaveBeenCalled();
    });
  });
});
