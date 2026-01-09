import { beforeEach, describe, expect, test, vi } from "vitest";

import {
  createTestMainStore,
  MOCK_DATA_DIR,
  setupMarkdownDirPersisterMocks,
  TEST_UUID_1,
  TEST_UUID_2,
} from "../testing/mocks";
import { createOrganizationPersister } from "./persister";

setupMarkdownDirPersisterMocks();

describe("createOrganizationPersister", () => {
  let store: ReturnType<typeof createTestMainStore>;

  beforeEach(() => {
    store = createTestMainStore();
    vi.clearAllMocks();
  });

  test("returns a persister object with expected methods", () => {
    const persister = createOrganizationPersister(store);

    expect(persister).toBeDefined();
    expect(persister.save).toBeTypeOf("function");
    expect(persister.load).toBeTypeOf("function");
    expect(persister.destroy).toBeTypeOf("function");
  });

  describe("load", () => {
    test("loads organizations from markdown files", async () => {
      const { commands: fsSyncCommands } = await import("@hypr/plugin-fs-sync");

      vi.mocked(fsSyncCommands.readDocumentBatch).mockResolvedValue({
        status: "ok",
        data: {
          [TEST_UUID_1]: {
            frontmatter: {
              created_at: "2024-01-01T00:00:00Z",
              name: "Acme Corp",
              user_id: "user-1",
            },
            content: "",
          },
        },
      });

      const persister = createOrganizationPersister(store);
      await persister.load();

      expect(fsSyncCommands.readDocumentBatch).toHaveBeenCalledWith(
        `${MOCK_DATA_DIR}/organizations`,
      );

      const organizations = store.getTable("organizations");
      expect(organizations[TEST_UUID_1]).toEqual({
        user_id: "user-1",
        created_at: "2024-01-01T00:00:00Z",
        name: "Acme Corp",
      });
    });

    test("returns empty organizations when directory does not exist", async () => {
      const { commands: fsSyncCommands } = await import("@hypr/plugin-fs-sync");

      vi.mocked(fsSyncCommands.readDocumentBatch).mockResolvedValue({
        status: "error",
        error: "No such file or directory",
      });

      const persister = createOrganizationPersister(store);
      await persister.load();

      expect(store.getTable("organizations")).toEqual({});
    });

    test("skips non-UUID files", async () => {
      const { commands: fsSyncCommands } = await import("@hypr/plugin-fs-sync");

      vi.mocked(fsSyncCommands.readDocumentBatch).mockResolvedValue({
        status: "ok",
        data: {
          [TEST_UUID_1]: {
            frontmatter: {
              created_at: "2024-01-01T00:00:00Z",
              name: "Acme Corp",
              user_id: "user-1",
            },
            content: "",
          },
        },
      });

      const persister = createOrganizationPersister(store);
      await persister.load();

      const organizations = store.getTable("organizations");
      expect(Object.keys(organizations)).toHaveLength(1);
      expect(organizations[TEST_UUID_1]).toBeDefined();
    });
  });

  describe("save", () => {
    test("saves organizations to markdown files via frontmatter plugin", async () => {
      const { commands: fsSyncCommands } = await import("@hypr/plugin-fs-sync");

      store.setRow("organizations", TEST_UUID_1, {
        user_id: "user-1",
        created_at: "2024-01-01T00:00:00Z",
        name: "Acme Corp",
      });

      const persister = createOrganizationPersister(store);
      await persister.save();

      expect(fsSyncCommands.writeDocumentBatch).toHaveBeenCalledWith([
        [
          {
            frontmatter: {
              created_at: "2024-01-01T00:00:00Z",
              name: "Acme Corp",
              user_id: "user-1",
            },
            content: "",
          },
          `${MOCK_DATA_DIR}/organizations/${TEST_UUID_1}.md`,
        ],
      ]);
    });

    test("does not write when no organizations exist", async () => {
      const { commands: fsSyncCommands } = await import("@hypr/plugin-fs-sync");

      const persister = createOrganizationPersister(store);
      await persister.save();

      expect(fsSyncCommands.writeDocumentBatch).not.toHaveBeenCalled();
    });

    test("saves multiple organizations in single batch call", async () => {
      const { commands: fsSyncCommands } = await import("@hypr/plugin-fs-sync");

      store.setRow("organizations", TEST_UUID_1, {
        user_id: "user-1",
        created_at: "2024-01-01T00:00:00Z",
        name: "Acme Corp",
      });

      store.setRow("organizations", TEST_UUID_2, {
        user_id: "user-1",
        created_at: "2024-01-02T00:00:00Z",
        name: "Beta Inc",
      });

      const persister = createOrganizationPersister(store);
      await persister.save();

      expect(fsSyncCommands.writeDocumentBatch).toHaveBeenCalledTimes(1);

      const batchItems = vi.mocked(fsSyncCommands.writeDocumentBatch).mock
        .calls[0][0];
      expect(batchItems).toHaveLength(2);

      const paths = batchItems.map((item: [unknown, string]) => item[1]);
      expect(paths).toContain(
        `${MOCK_DATA_DIR}/organizations/${TEST_UUID_1}.md`,
      );
      expect(paths).toContain(
        `${MOCK_DATA_DIR}/organizations/${TEST_UUID_2}.md`,
      );
    });
  });
});
