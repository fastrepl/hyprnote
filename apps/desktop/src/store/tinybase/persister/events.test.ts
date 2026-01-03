import { createMergeableStore } from "tinybase/with-schemas";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { SCHEMA, type Schemas } from "@hypr/store";

import { createEventPersister } from "./events/persister";

vi.mock("@hypr/plugin-path2", () => ({
  commands: {
    base: vi.fn().mockResolvedValue("/mock/data/dir/hyprnote"),
  },
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  readTextFile: vi.fn(),
  writeTextFile: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@hypr/plugin-notify", () => ({
  events: {
    fileChanged: {
      listen: vi.fn().mockResolvedValue(() => {}),
    },
  },
}));

function createTestStore() {
  return createMergeableStore()
    .setTablesSchema(SCHEMA.table)
    .setValuesSchema(SCHEMA.value);
}

describe("createEventPersister", () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
    vi.clearAllMocks();
  });

  test("returns a persister object with expected methods", () => {
    const persister = createEventPersister<Schemas>(store);

    expect(persister).toBeDefined();
    expect(persister.save).toBeTypeOf("function");
    expect(persister.load).toBeTypeOf("function");
    expect(persister.destroy).toBeTypeOf("function");
  });

  describe("load", () => {
    test("loads events from json file", async () => {
      const { readTextFile } = await import("@tauri-apps/plugin-fs");

      const mockData = {
        "event-1": {
          user_id: "user-1",
          created_at: "2024-01-01T00:00:00Z",
          tracking_id_event: "tracking-1",
          calendar_id: "cal-1",
          title: "Team Meeting",
          started_at: "2024-01-01T10:00:00Z",
          ended_at: "2024-01-01T11:00:00Z",
          location: "Conference Room A",
          meeting_link: "https://meet.example.com/abc",
          description: "Weekly team sync",
          note: "",
          ignored: false,
          recurrence_series_id: "",
        },
      };
      vi.mocked(readTextFile).mockResolvedValue(JSON.stringify(mockData));

      const persister = createEventPersister<Schemas>(store);
      await persister.load();

      expect(readTextFile).toHaveBeenCalledWith(
        "/mock/data/dir/hyprnote/events.json",
      );
      expect(store.getTable("events")).toEqual(mockData);
    });

    test("returns empty events when file does not exist", async () => {
      const { readTextFile } = await import("@tauri-apps/plugin-fs");

      vi.mocked(readTextFile).mockRejectedValue(
        new Error("No such file or directory"),
      );

      const persister = createEventPersister<Schemas>(store);
      await persister.load();

      expect(store.getTable("events")).toEqual({});
    });
  });

  describe("save", () => {
    test("saves events to json file", async () => {
      const { writeTextFile } = await import("@tauri-apps/plugin-fs");

      store.setRow("events", "event-1", {
        user_id: "user-1",
        created_at: "2024-01-01T00:00:00Z",
        tracking_id_event: "tracking-1",
        calendar_id: "cal-1",
        title: "Team Meeting",
        started_at: "2024-01-01T10:00:00Z",
        ended_at: "2024-01-01T11:00:00Z",
        location: "Conference Room A",
        meeting_link: "https://meet.example.com/abc",
        description: "Weekly team sync",
        note: "",
        ignored: false,
        recurrence_series_id: "",
      });

      const persister = createEventPersister<Schemas>(store);
      await persister.save();

      expect(writeTextFile).toHaveBeenCalledWith(
        "/mock/data/dir/hyprnote/events.json",
        expect.any(String),
      );

      const writtenContent = vi.mocked(writeTextFile).mock.calls[0][1];
      const parsed = JSON.parse(writtenContent);

      expect(parsed["event-1"].title).toBe("Team Meeting");
    });

    test("writes empty object when no events exist", async () => {
      const { writeTextFile } = await import("@tauri-apps/plugin-fs");

      const persister = createEventPersister<Schemas>(store);
      await persister.save();

      expect(writeTextFile).toHaveBeenCalledWith(
        "/mock/data/dir/hyprnote/events.json",
        "{}",
      );
    });

    test("saves multiple events", async () => {
      const { writeTextFile } = await import("@tauri-apps/plugin-fs");

      store.setRow("events", "event-1", {
        user_id: "user-1",
        created_at: "2024-01-01T00:00:00Z",
        tracking_id_event: "tracking-1",
        calendar_id: "cal-1",
        title: "Team Meeting",
        started_at: "2024-01-01T10:00:00Z",
        ended_at: "2024-01-01T11:00:00Z",
        location: "",
        meeting_link: "",
        description: "",
        note: "",
        ignored: false,
        recurrence_series_id: "",
      });

      store.setRow("events", "event-2", {
        user_id: "user-1",
        created_at: "2024-01-02T00:00:00Z",
        tracking_id_event: "tracking-2",
        calendar_id: "cal-1",
        title: "1:1 with Manager",
        started_at: "2024-01-02T14:00:00Z",
        ended_at: "2024-01-02T14:30:00Z",
        location: "",
        meeting_link: "",
        description: "",
        note: "",
        ignored: false,
        recurrence_series_id: "",
      });

      const persister = createEventPersister<Schemas>(store);
      await persister.save();

      const writtenContent = vi.mocked(writeTextFile).mock.calls[0][1];
      const parsed = JSON.parse(writtenContent);

      expect(Object.keys(parsed)).toHaveLength(2);
      expect(parsed["event-1"].title).toBe("Team Meeting");
      expect(parsed["event-2"].title).toBe("1:1 with Manager");
    });
  });
});
