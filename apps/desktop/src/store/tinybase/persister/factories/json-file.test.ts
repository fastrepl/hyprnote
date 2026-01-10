import { beforeEach, describe, expect, test, vi } from "vitest";

import { createTestMainStore, MOCK_DATA_DIR } from "../testing/mocks";
import { createJsonFilePersister } from "./json-file";

const path2Mocks = vi.hoisted(() => ({
  base: vi.fn().mockResolvedValue("/mock/data/dir/hyprnote"),
}));

const fsMocks = vi.hoisted(() => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  readTextFile: vi.fn(),
  writeTextFile: vi.fn().mockResolvedValue(undefined),
}));

const notifyMocks = vi.hoisted(() => ({
  fileChanged: {
    listen: vi.fn().mockResolvedValue(() => {}),
  },
}));

vi.mock("@hypr/plugin-path2", () => ({ commands: path2Mocks }));
vi.mock("@tauri-apps/plugin-fs", () => fsMocks);
vi.mock("@hypr/plugin-notify", () => ({ events: notifyMocks }));

describe("createJsonFilePersister", () => {
  let store: ReturnType<typeof createTestMainStore>;

  beforeEach(() => {
    store = createTestMainStore();
    vi.clearAllMocks();
  });

  test("returns a persister object with expected methods", () => {
    const persister = createJsonFilePersister(store, {
      tableName: "events",
      filename: "test.json",
      label: "test",
    });

    expect(persister).toBeDefined();
    expect(persister.save).toBeTypeOf("function");
    expect(persister.load).toBeTypeOf("function");
    expect(persister.destroy).toBeTypeOf("function");
  });

  describe("load", () => {
    test("loads data from json file into specified table", async () => {
      const mockData = {
        "item-1": {
          user_id: "user-1",
          created_at: "2024-01-01T00:00:00Z",
          tracking_id_event: "tracking-1",
          calendar_id: "cal-1",
          title: "Test Event",
          started_at: "2024-01-01T10:00:00Z",
          ended_at: "2024-01-01T11:00:00Z",
          location: "",
          meeting_link: "",
          description: "",
          note: "",
          ignored: false,
          recurrence_series_id: "",
        },
      };
      fsMocks.readTextFile.mockResolvedValue(JSON.stringify(mockData));

      const persister = createJsonFilePersister(store, {
        tableName: "events",
        filename: "test.json",
        label: "test",
      });
      await persister.load();

      expect(fsMocks.readTextFile).toHaveBeenCalledWith(
        `${MOCK_DATA_DIR}/test.json`,
      );
      expect(store.getTable("events")).toEqual(mockData);
    });

    test("handles file not found gracefully", async () => {
      fsMocks.readTextFile.mockRejectedValue(
        new Error("No such file or directory"),
      );

      const persister = createJsonFilePersister(store, {
        tableName: "events",
        filename: "nonexistent.json",
        label: "test",
      });
      await persister.load();

      expect(store.getTable("events")).toEqual({});
    });
  });

  describe("save", () => {
    test("saves table data to json file", async () => {
      store.setRow("events", "item-1", {
        user_id: "user-1",
        created_at: "2024-01-01T00:00:00Z",
        tracking_id_event: "tracking-1",
        calendar_id: "cal-1",
        title: "Test Event",
        started_at: "2024-01-01T10:00:00Z",
        ended_at: "2024-01-01T11:00:00Z",
        location: "",
        meeting_link: "",
        description: "",
        note: "",
        ignored: false,
        recurrence_series_id: "",
      });

      const persister = createJsonFilePersister(store, {
        tableName: "events",
        filename: "test.json",
        label: "test",
      });
      await persister.save();

      expect(fsMocks.writeTextFile).toHaveBeenCalledWith(
        `${MOCK_DATA_DIR}/test.json`,
        expect.any(String),
      );

      const writtenContent = fsMocks.writeTextFile.mock.calls[0][1];
      const parsed = JSON.parse(writtenContent);

      expect(parsed["item-1"].title).toBe("Test Event");
    });

    test("writes empty object when table is empty", async () => {
      const persister = createJsonFilePersister(store, {
        tableName: "events",
        filename: "test.json",
        label: "test",
      });
      await persister.save();

      expect(fsMocks.writeTextFile).toHaveBeenCalledWith(
        `${MOCK_DATA_DIR}/test.json`,
        "{}",
      );
    });
  });
});
