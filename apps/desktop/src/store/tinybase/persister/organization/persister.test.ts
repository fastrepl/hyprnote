import { createMergeableStore } from "tinybase/with-schemas";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { SCHEMA, type Schemas } from "@hypr/store";

import { createOrganizationPersister } from "./persister";

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

describe("createOrganizationPersister", () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
    vi.clearAllMocks();
  });

  test("returns a persister object with expected methods", () => {
    const persister = createOrganizationPersister<Schemas>(store);

    expect(persister).toBeDefined();
    expect(persister.save).toBeTypeOf("function");
    expect(persister.load).toBeTypeOf("function");
    expect(persister.destroy).toBeTypeOf("function");
  });

  describe("load", () => {
    test("loads organizations from json file", async () => {
      const { readTextFile } = await import("@tauri-apps/plugin-fs");

      const mockData = {
        "org-1": {
          user_id: "user-1",
          created_at: "2024-01-01T00:00:00Z",
          name: "Acme Corp",
        },
      };
      vi.mocked(readTextFile).mockResolvedValue(JSON.stringify(mockData));

      const persister = createOrganizationPersister<Schemas>(store);
      await persister.load();

      expect(readTextFile).toHaveBeenCalledWith(
        "/mock/data/dir/hyprnote/organizations.json",
      );
      expect(store.getTable("organizations")).toEqual(mockData);
    });

    test("returns empty organizations when file does not exist", async () => {
      const { readTextFile } = await import("@tauri-apps/plugin-fs");

      vi.mocked(readTextFile).mockRejectedValue(
        new Error("No such file or directory"),
      );

      const persister = createOrganizationPersister<Schemas>(store);
      await persister.load();

      expect(store.getTable("organizations")).toEqual({});
    });
  });

  describe("save", () => {
    test("saves organizations to json file", async () => {
      const { writeTextFile } = await import("@tauri-apps/plugin-fs");

      store.setRow("organizations", "org-1", {
        user_id: "user-1",
        created_at: "2024-01-01T00:00:00Z",
        name: "Acme Corp",
      });

      const persister = createOrganizationPersister<Schemas>(store);
      await persister.save();

      expect(writeTextFile).toHaveBeenCalledWith(
        "/mock/data/dir/hyprnote/organizations.json",
        expect.any(String),
      );

      const writtenContent = vi.mocked(writeTextFile).mock.calls[0][1];
      const parsed = JSON.parse(writtenContent);

      expect(parsed).toEqual({
        "org-1": {
          user_id: "user-1",
          created_at: "2024-01-01T00:00:00Z",
          name: "Acme Corp",
        },
      });
    });

    test("writes empty object when no organizations exist", async () => {
      const { writeTextFile } = await import("@tauri-apps/plugin-fs");

      const persister = createOrganizationPersister<Schemas>(store);
      await persister.save();

      expect(writeTextFile).toHaveBeenCalledWith(
        "/mock/data/dir/hyprnote/organizations.json",
        "{}",
      );
    });

    test("saves multiple organizations", async () => {
      const { writeTextFile } = await import("@tauri-apps/plugin-fs");

      store.setRow("organizations", "org-1", {
        user_id: "user-1",
        created_at: "2024-01-01T00:00:00Z",
        name: "Acme Corp",
      });

      store.setRow("organizations", "org-2", {
        user_id: "user-1",
        created_at: "2024-01-02T00:00:00Z",
        name: "Beta Inc",
      });

      const persister = createOrganizationPersister<Schemas>(store);
      await persister.save();

      const writtenContent = vi.mocked(writeTextFile).mock.calls[0][1];
      const parsed = JSON.parse(writtenContent);

      expect(Object.keys(parsed)).toHaveLength(2);
      expect(parsed["org-1"].name).toBe("Acme Corp");
      expect(parsed["org-2"].name).toBe("Beta Inc");
    });
  });
});
