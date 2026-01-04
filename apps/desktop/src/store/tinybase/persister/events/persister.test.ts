import { createMergeableStore } from "tinybase/with-schemas";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { SCHEMA, type Schemas } from "@hypr/store";

import { createEventPersister } from "./persister";

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
    test("load is a no-op and does not read files", async () => {
      const { readTextFile } = await import("@tauri-apps/plugin-fs");

      const persister = createEventPersister<Schemas>(store);
      await persister.load();

      expect(readTextFile).not.toHaveBeenCalled();
      expect(store.getTable("events")).toEqual({});
    });

    test("load does not modify existing store data", async () => {
      store.setRow("events", "existing-event", {
        user_id: "user-1",
        created_at: "2024-01-01T00:00:00Z",
        tracking_id_event: "tracking-1",
        calendar_id: "cal-1",
        title: "Existing Event",
        started_at: "2024-01-01T10:00:00Z",
        ended_at: "2024-01-01T11:00:00Z",
        location: "",
        meeting_link: "",
        description: "",
        note: "",
        ignored: false,
        recurrence_series_id: "",
      });

      const persister = createEventPersister<Schemas>(store);
      await persister.load();

      expect(store.getTable("events")).toEqual({
        "existing-event": {
          user_id: "user-1",
          created_at: "2024-01-01T00:00:00Z",
          tracking_id_event: "tracking-1",
          calendar_id: "cal-1",
          title: "Existing Event",
          started_at: "2024-01-01T10:00:00Z",
          ended_at: "2024-01-01T11:00:00Z",
          location: "",
          meeting_link: "",
          description: "",
          note: "",
          ignored: false,
          recurrence_series_id: "",
        },
      });
    });
  });

  describe("save", () => {
    test("saves event to markdown file with frontmatter", async () => {
      const { mkdir, writeTextFile } = await import("@tauri-apps/plugin-fs");

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

      expect(mkdir).toHaveBeenCalledWith("/mock/data/dir/hyprnote/events", {
        recursive: true,
      });
      expect(writeTextFile).toHaveBeenCalledWith(
        "/mock/data/dir/hyprnote/events/event-1.md",
        expect.any(String),
      );

      const writtenContent = vi.mocked(writeTextFile).mock.calls[0][1];
      expect(writtenContent).toContain("---");
      expect(writtenContent).toContain('id: "event-1"');
      expect(writtenContent).toContain('title: "Team Meeting"');
      expect(writtenContent).toContain('calendar_id: "cal-1"');
      expect(writtenContent).toContain("ignored: false");
    });

    test("does not write files when no events exist", async () => {
      const { mkdir, writeTextFile } = await import("@tauri-apps/plugin-fs");

      const persister = createEventPersister<Schemas>(store);
      await persister.save();

      expect(mkdir).toHaveBeenCalledWith("/mock/data/dir/hyprnote/events", {
        recursive: true,
      });
      expect(writeTextFile).not.toHaveBeenCalled();
    });

    test("saves multiple events to separate markdown files", async () => {
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

      expect(writeTextFile).toHaveBeenCalledTimes(2);

      const calls = vi.mocked(writeTextFile).mock.calls;
      const paths = calls.map((call) => call[0]);
      expect(paths).toContain("/mock/data/dir/hyprnote/events/event-1.md");
      expect(paths).toContain("/mock/data/dir/hyprnote/events/event-2.md");
    });

    test("saves note content in markdown body", async () => {
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
        note: "This is my meeting note",
        ignored: false,
        recurrence_series_id: "",
      });

      const persister = createEventPersister<Schemas>(store);
      await persister.save();

      const writtenContent = vi.mocked(writeTextFile).mock.calls[0][1];
      expect(writtenContent).toContain("This is my meeting note");
    });
  });
});
