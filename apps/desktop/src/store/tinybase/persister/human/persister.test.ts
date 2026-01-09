import { beforeEach, describe, expect, test, vi } from "vitest";

import {
  createTestMainStore,
  MOCK_DATA_DIR,
  setupMarkdownDirPersisterMocks,
  TEST_UUID_1,
  TEST_UUID_2,
} from "../testing/mocks";
import { createHumanPersister } from "./persister";

setupMarkdownDirPersisterMocks();

describe("createHumanPersister", () => {
  let store: ReturnType<typeof createTestMainStore>;

  beforeEach(() => {
    store = createTestMainStore();
    vi.clearAllMocks();
  });

  test("returns a persister object with expected methods", () => {
    const persister = createHumanPersister(store);

    expect(persister).toBeDefined();
    expect(persister.save).toBeTypeOf("function");
    expect(persister.load).toBeTypeOf("function");
    expect(persister.destroy).toBeTypeOf("function");
  });

  describe("load", () => {
    test("loads humans from markdown files", async () => {
      const { commands: fsSyncCommands } = await import("@hypr/plugin-fs-sync");

      vi.mocked(fsSyncCommands.readDocumentBatch).mockResolvedValue({
        status: "ok",
        data: {
          [TEST_UUID_1]: {
            frontmatter: {
              user_id: "user-1",
              created_at: "2024-01-01T00:00:00Z",
              name: "John Doe",
              email: "john@example.com",
              org_id: "org-1",
              job_title: "Engineer",
              linkedin_username: "johndoe",
            },
            content: "Some notes",
          },
        },
      });

      const persister = createHumanPersister(store);
      await persister.load();

      expect(fsSyncCommands.readDocumentBatch).toHaveBeenCalledWith(
        `${MOCK_DATA_DIR}/humans`,
      );

      const humans = store.getTable("humans");
      expect(humans[TEST_UUID_1]).toEqual({
        user_id: "user-1",
        created_at: "2024-01-01T00:00:00Z",
        name: "John Doe",
        email: "john@example.com",
        org_id: "org-1",
        job_title: "Engineer",
        linkedin_username: "johndoe",
        memo: "Some notes",
      });
    });

    test("returns empty humans when directory does not exist", async () => {
      const { commands: fsSyncCommands } = await import("@hypr/plugin-fs-sync");

      vi.mocked(fsSyncCommands.readDocumentBatch).mockResolvedValue({
        status: "error",
        error: "No such file or directory",
      });

      const persister = createHumanPersister(store);
      await persister.load();

      expect(store.getTable("humans")).toEqual({});
    });

    test("skips non-UUID files", async () => {
      const { commands: fsSyncCommands } = await import("@hypr/plugin-fs-sync");

      vi.mocked(fsSyncCommands.readDocumentBatch).mockResolvedValue({
        status: "ok",
        data: {
          [TEST_UUID_1]: {
            frontmatter: {
              user_id: "user-1",
              created_at: "2024-01-01T00:00:00Z",
              name: "John Doe",
              email: "john@example.com",
              org_id: "",
              job_title: "",
              linkedin_username: "",
            },
            content: "",
          },
        },
      });

      const persister = createHumanPersister(store);
      await persister.load();

      const humans = store.getTable("humans");
      expect(Object.keys(humans)).toHaveLength(1);
      expect(humans[TEST_UUID_1]).toBeDefined();
    });
  });

  describe("save", () => {
    test("saves humans to markdown files via frontmatter plugin", async () => {
      const { commands: fsSyncCommands } = await import("@hypr/plugin-fs-sync");

      store.setRow("humans", TEST_UUID_1, {
        user_id: "user-1",
        created_at: "2024-01-01T00:00:00Z",
        name: "John Doe",
        email: "john@example.com",
        org_id: "org-1",
        job_title: "Engineer",
        linkedin_username: "johndoe",
        memo: "Some notes",
      });

      const persister = createHumanPersister(store);
      await persister.save();

      expect(fsSyncCommands.writeDocumentBatch).toHaveBeenCalledWith([
        [
          {
            frontmatter: {
              user_id: "user-1",
              created_at: "2024-01-01T00:00:00Z",
              name: "John Doe",
              emails: ["john@example.com"],
              org_id: "org-1",
              job_title: "Engineer",
              linkedin_username: "johndoe",
            },
            content: "Some notes",
          },
          `${MOCK_DATA_DIR}/humans/${TEST_UUID_1}.md`,
        ],
      ]);
    });

    test("does not write when no humans exist", async () => {
      const { commands: fsSyncCommands } = await import("@hypr/plugin-fs-sync");

      const persister = createHumanPersister(store);
      await persister.save();

      expect(fsSyncCommands.writeDocumentBatch).not.toHaveBeenCalled();
    });

    test("saves multiple humans in single batch call", async () => {
      const { commands: fsSyncCommands } = await import("@hypr/plugin-fs-sync");

      store.setRow("humans", TEST_UUID_1, {
        user_id: "user-1",
        created_at: "2024-01-01T00:00:00Z",
        name: "John Doe",
        email: "john@example.com",
        org_id: "org-1",
        job_title: "Engineer",
        linkedin_username: "johndoe",
        memo: "",
      });

      store.setRow("humans", TEST_UUID_2, {
        user_id: "user-1",
        created_at: "2024-01-02T00:00:00Z",
        name: "Jane Smith",
        email: "jane@example.com",
        org_id: "org-2",
        job_title: "Manager",
        linkedin_username: "janesmith",
        memo: "",
      });

      const persister = createHumanPersister(store);
      await persister.save();

      expect(fsSyncCommands.writeDocumentBatch).toHaveBeenCalledTimes(1);

      const batchItems = vi.mocked(fsSyncCommands.writeDocumentBatch).mock
        .calls[0][0];
      expect(batchItems).toHaveLength(2);

      const paths = batchItems.map((item: [unknown, string]) => item[1]);
      expect(paths).toContain(`${MOCK_DATA_DIR}/humans/${TEST_UUID_1}.md`);
      expect(paths).toContain(`${MOCK_DATA_DIR}/humans/${TEST_UUID_2}.md`);
    });
  });

  describe("email transform", () => {
    test("loads with emails array (new format)", async () => {
      const { commands: fsSyncCommands } = await import("@hypr/plugin-fs-sync");

      vi.mocked(fsSyncCommands.readDocumentBatch).mockResolvedValue({
        status: "ok",
        data: {
          [TEST_UUID_1]: {
            frontmatter: {
              user_id: "user-1",
              created_at: "2024-01-01T00:00:00Z",
              name: "John Doe",
              emails: ["john@example.com", "john.doe@work.com"],
              org_id: "org-1",
              job_title: "Engineer",
              linkedin_username: "johndoe",
            },
            content: "",
          },
        },
      });

      const persister = createHumanPersister(store);
      await persister.load();

      const humans = store.getTable("humans");
      expect(humans[TEST_UUID_1]?.email).toBe(
        "john@example.com,john.doe@work.com",
      );
    });

    test("loads with legacy email string (backward compat)", async () => {
      const { commands: fsSyncCommands } = await import("@hypr/plugin-fs-sync");

      vi.mocked(fsSyncCommands.readDocumentBatch).mockResolvedValue({
        status: "ok",
        data: {
          [TEST_UUID_1]: {
            frontmatter: {
              user_id: "user-1",
              created_at: "2024-01-01T00:00:00Z",
              name: "John Doe",
              email: "john@example.com",
              org_id: "org-1",
              job_title: "Engineer",
              linkedin_username: "johndoe",
            },
            content: "",
          },
        },
      });

      const persister = createHumanPersister(store);
      await persister.load();

      const humans = store.getTable("humans");
      expect(humans[TEST_UUID_1]?.email).toBe("john@example.com");
    });

    test("saves multiple emails as array", async () => {
      const { commands: fsSyncCommands } = await import("@hypr/plugin-fs-sync");

      store.setRow("humans", TEST_UUID_1, {
        user_id: "user-1",
        created_at: "2024-01-01T00:00:00Z",
        name: "John Doe",
        email: "john@example.com,john.doe@work.com",
        org_id: "org-1",
        job_title: "Engineer",
        linkedin_username: "johndoe",
        memo: "",
      });

      const persister = createHumanPersister(store);
      await persister.save();

      const batchItems = vi.mocked(fsSyncCommands.writeDocumentBatch).mock
        .calls[0][0];
      const frontmatter = batchItems[0][0].frontmatter;

      expect(frontmatter.emails).toEqual([
        "john@example.com",
        "john.doe@work.com",
      ]);
      expect(frontmatter.email).toBeUndefined();
    });
  });
});
