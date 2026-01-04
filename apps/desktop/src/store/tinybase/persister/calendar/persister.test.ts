import { createMergeableStore } from "tinybase/with-schemas";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { SCHEMA, type Schemas } from "@hypr/store";

import { createCalendarPersister } from "./persister";

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

function createTestStore() {
  return createMergeableStore()
    .setTablesSchema(SCHEMA.table)
    .setValuesSchema(SCHEMA.value);
}

describe("createCalendarPersister", () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
    vi.clearAllMocks();
  });

  test("returns a persister object with expected methods", () => {
    const persister = createCalendarPersister<Schemas>(store);

    expect(persister).toBeDefined();
    expect(persister.save).toBeTypeOf("function");
    expect(persister.load).toBeTypeOf("function");
    expect(persister.destroy).toBeTypeOf("function");
  });

  describe("load", () => {
    test("load is a no-op and does not read files", async () => {
      const { readTextFile } = await import("@tauri-apps/plugin-fs");

      const persister = createCalendarPersister<Schemas>(store);
      await persister.load();

      expect(readTextFile).not.toHaveBeenCalled();
      expect(store.getTable("calendars")).toEqual({});
    });

    test("load does not modify existing store data", async () => {
      store.setRow("calendars", "existing-cal", {
        user_id: "user-1",
        created_at: "2024-01-01T00:00:00Z",
        tracking_id_calendar: "tracking-1",
        name: "Existing Calendar",
        enabled: true,
        provider: "apple",
        source: "",
        color: "",
      });

      const persister = createCalendarPersister<Schemas>(store);
      await persister.load();

      expect(store.getTable("calendars")).toEqual({
        "existing-cal": {
          user_id: "user-1",
          created_at: "2024-01-01T00:00:00Z",
          tracking_id_calendar: "tracking-1",
          name: "Existing Calendar",
          enabled: true,
          provider: "apple",
          source: "",
          color: "",
        },
      });
    });
  });

  describe("save", () => {
    test("saves calendar to markdown file with frontmatter", async () => {
      const { mkdir, writeTextFile } = await import("@tauri-apps/plugin-fs");

      store.setRow("calendars", "cal-1", {
        user_id: "user-1",
        created_at: "2024-01-01T00:00:00Z",
        tracking_id_calendar: "tracking-1",
        name: "Work Calendar",
        enabled: true,
        provider: "apple",
        source: "iCloud",
        color: "#FF0000",
      });

      const persister = createCalendarPersister<Schemas>(store);
      await persister.save();

      expect(mkdir).toHaveBeenCalledWith("/mock/data/dir/hyprnote/calendars", {
        recursive: true,
      });
      expect(writeTextFile).toHaveBeenCalledWith(
        "/mock/data/dir/hyprnote/calendars/cal-1.md",
        expect.any(String),
      );

      const writtenContent = vi.mocked(writeTextFile).mock.calls[0][1];
      expect(writtenContent).toContain("---");
      expect(writtenContent).toContain('id: "cal-1"');
      expect(writtenContent).toContain('name: "Work Calendar"');
      expect(writtenContent).toContain("enabled: true");
      expect(writtenContent).toContain('provider: "apple"');
      expect(writtenContent).toContain('color: "#FF0000"');
    });

    test("does not write files when no calendars exist", async () => {
      const { mkdir, writeTextFile } = await import("@tauri-apps/plugin-fs");

      const persister = createCalendarPersister<Schemas>(store);
      await persister.save();

      expect(mkdir).toHaveBeenCalledWith("/mock/data/dir/hyprnote/calendars", {
        recursive: true,
      });
      expect(writeTextFile).not.toHaveBeenCalled();
    });

    test("saves multiple calendars to separate markdown files", async () => {
      const { writeTextFile } = await import("@tauri-apps/plugin-fs");

      store.setRow("calendars", "cal-1", {
        user_id: "user-1",
        created_at: "2024-01-01T00:00:00Z",
        tracking_id_calendar: "tracking-1",
        name: "Work Calendar",
        enabled: true,
        provider: "apple",
        source: "iCloud",
        color: "#FF0000",
      });

      store.setRow("calendars", "cal-2", {
        user_id: "user-1",
        created_at: "2024-01-02T00:00:00Z",
        tracking_id_calendar: "tracking-2",
        name: "Personal Calendar",
        enabled: false,
        provider: "google",
        source: "Gmail",
        color: "#00FF00",
      });

      const persister = createCalendarPersister<Schemas>(store);
      await persister.save();

      expect(writeTextFile).toHaveBeenCalledTimes(2);

      const calls = vi.mocked(writeTextFile).mock.calls;
      const paths = calls.map((call) => call[0]);
      expect(paths).toContain("/mock/data/dir/hyprnote/calendars/cal-1.md");
      expect(paths).toContain("/mock/data/dir/hyprnote/calendars/cal-2.md");
    });
  });
});
