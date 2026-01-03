import { createMergeableStore } from "tinybase/with-schemas";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { SCHEMA, type Schemas } from "@hypr/store";

import { createHumanPersister } from "./persister";

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

describe("createHumanPersister", () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
    vi.clearAllMocks();
  });

  test("returns a persister object with expected methods", () => {
    const persister = createHumanPersister<Schemas>(store);

    expect(persister).toBeDefined();
    expect(persister.save).toBeTypeOf("function");
    expect(persister.load).toBeTypeOf("function");
    expect(persister.destroy).toBeTypeOf("function");
  });

  describe("load", () => {
    test("loads humans from json file", async () => {
      const { readTextFile } = await import("@tauri-apps/plugin-fs");

      const mockData = {
        "human-1": {
          user_id: "user-1",
          created_at: "2024-01-01T00:00:00Z",
          name: "John Doe",
          email: "john@example.com",
          org_id: "org-1",
          job_title: "Engineer",
          linkedin_username: "johndoe",
          memo: "Some notes",
        },
      };
      vi.mocked(readTextFile).mockResolvedValue(JSON.stringify(mockData));

      const persister = createHumanPersister<Schemas>(store);
      await persister.load();

      expect(readTextFile).toHaveBeenCalledWith(
        "/mock/data/dir/hyprnote/humans.json",
      );
      expect(store.getTable("humans")).toEqual(mockData);
    });

    test("returns empty humans when file does not exist", async () => {
      const { readTextFile } = await import("@tauri-apps/plugin-fs");

      vi.mocked(readTextFile).mockRejectedValue(
        new Error("No such file or directory"),
      );

      const persister = createHumanPersister<Schemas>(store);
      await persister.load();

      expect(store.getTable("humans")).toEqual({});
    });
  });

  describe("save", () => {
    test("saves humans to json file", async () => {
      const { writeTextFile } = await import("@tauri-apps/plugin-fs");

      store.setRow("humans", "human-1", {
        user_id: "user-1",
        created_at: "2024-01-01T00:00:00Z",
        name: "John Doe",
        email: "john@example.com",
        org_id: "org-1",
        job_title: "Engineer",
        linkedin_username: "johndoe",
        memo: "Some notes",
      });

      const persister = createHumanPersister<Schemas>(store);
      await persister.save();

      expect(writeTextFile).toHaveBeenCalledWith(
        "/mock/data/dir/hyprnote/humans.json",
        expect.any(String),
      );

      const writtenContent = vi.mocked(writeTextFile).mock.calls[0][1];
      const parsed = JSON.parse(writtenContent);

      expect(parsed).toEqual({
        "human-1": {
          user_id: "user-1",
          created_at: "2024-01-01T00:00:00Z",
          name: "John Doe",
          email: "john@example.com",
          org_id: "org-1",
          job_title: "Engineer",
          linkedin_username: "johndoe",
          memo: "Some notes",
        },
      });
    });

    test("writes empty object when no humans exist", async () => {
      const { writeTextFile } = await import("@tauri-apps/plugin-fs");

      const persister = createHumanPersister<Schemas>(store);
      await persister.save();

      expect(writeTextFile).toHaveBeenCalledWith(
        "/mock/data/dir/hyprnote/humans.json",
        "{}",
      );
    });

    test("saves multiple humans", async () => {
      const { writeTextFile } = await import("@tauri-apps/plugin-fs");

      store.setRow("humans", "human-1", {
        user_id: "user-1",
        created_at: "2024-01-01T00:00:00Z",
        name: "John Doe",
        email: "john@example.com",
        org_id: "org-1",
        job_title: "Engineer",
        linkedin_username: "johndoe",
        memo: "",
      });

      store.setRow("humans", "human-2", {
        user_id: "user-1",
        created_at: "2024-01-02T00:00:00Z",
        name: "Jane Smith",
        email: "jane@example.com",
        org_id: "org-2",
        job_title: "Manager",
        linkedin_username: "janesmith",
        memo: "",
      });

      const persister = createHumanPersister<Schemas>(store);
      await persister.save();

      const writtenContent = vi.mocked(writeTextFile).mock.calls[0][1];
      const parsed = JSON.parse(writtenContent);

      expect(Object.keys(parsed)).toHaveLength(2);
      expect(parsed["human-1"].name).toBe("John Doe");
      expect(parsed["human-2"].name).toBe("Jane Smith");
    });
  });
});
