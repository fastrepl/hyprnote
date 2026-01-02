import { createMergeableStore } from "tinybase/with-schemas";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { SCHEMA, type Schemas } from "@hypr/store";

import { createCalendarPersister } from "./calendar";

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
    test("loads calendars from json file", async () => {
      const { readTextFile } = await import("@tauri-apps/plugin-fs");

      const mockData = {
        "cal-1": {
          user_id: "user-1",
          created_at: "2024-01-01T00:00:00Z",
          tracking_id_calendar: "tracking-1",
          name: "Work Calendar",
          enabled: true,
          provider: "apple",
          source: "iCloud",
          color: "#FF0000",
        },
      };
      vi.mocked(readTextFile).mockResolvedValue(JSON.stringify(mockData));

      const persister = createCalendarPersister<Schemas>(store);
      await persister.load();

      expect(readTextFile).toHaveBeenCalledWith(
        "/mock/data/dir/hyprnote/calendars.json",
      );
      expect(store.getTable("calendars")).toEqual(mockData);
    });

    test("returns empty calendars when file does not exist", async () => {
      const { readTextFile } = await import("@tauri-apps/plugin-fs");

      vi.mocked(readTextFile).mockRejectedValue(
        new Error("No such file or directory"),
      );

      const persister = createCalendarPersister<Schemas>(store);
      await persister.load();

      expect(store.getTable("calendars")).toEqual({});
    });
  });

  describe("save", () => {
    test("saves calendars to json file", async () => {
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

      const persister = createCalendarPersister<Schemas>(store);
      await persister.save();

      expect(writeTextFile).toHaveBeenCalledWith(
        "/mock/data/dir/hyprnote/calendars.json",
        expect.any(String),
      );

      const writtenContent = vi.mocked(writeTextFile).mock.calls[0][1];
      const parsed = JSON.parse(writtenContent);

      expect(parsed).toEqual({
        "cal-1": {
          user_id: "user-1",
          created_at: "2024-01-01T00:00:00Z",
          tracking_id_calendar: "tracking-1",
          name: "Work Calendar",
          enabled: true,
          provider: "apple",
          source: "iCloud",
          color: "#FF0000",
        },
      });
    });

    test("writes empty object when no calendars exist", async () => {
      const { writeTextFile } = await import("@tauri-apps/plugin-fs");

      const persister = createCalendarPersister<Schemas>(store);
      await persister.save();

      expect(writeTextFile).toHaveBeenCalledWith(
        "/mock/data/dir/hyprnote/calendars.json",
        "{}",
      );
    });

    test("saves multiple calendars", async () => {
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

      const writtenContent = vi.mocked(writeTextFile).mock.calls[0][1];
      const parsed = JSON.parse(writtenContent);

      expect(Object.keys(parsed)).toHaveLength(2);
      expect(parsed["cal-1"].name).toBe("Work Calendar");
      expect(parsed["cal-2"].name).toBe("Personal Calendar");
    });
  });
});
