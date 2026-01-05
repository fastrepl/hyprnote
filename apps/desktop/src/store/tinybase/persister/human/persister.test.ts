import { beforeEach, describe, expect, test, vi } from "vitest";

import type { Schemas } from "@hypr/store";

import {
  createTestStore,
  MOCK_DATA_DIR,
  setupEntityPersisterMocks,
  TEST_UUID_1,
  TEST_UUID_2,
} from "../testing/mocks";
import { createHumanPersister } from "./persister";

setupEntityPersisterMocks();

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
    test("loads humans from markdown files", async () => {
      const { commands: fsSyncCommands } = await import("@hypr/plugin-fs-sync");

      vi.mocked(fsSyncCommands.readFrontmatterBatch).mockResolvedValue({
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

      const persister = createHumanPersister<Schemas>(store);
      await persister.load();

      expect(fsSyncCommands.readFrontmatterBatch).toHaveBeenCalledWith(
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

      vi.mocked(fsSyncCommands.readFrontmatterBatch).mockResolvedValue({
        status: "error",
        error: "No such file or directory",
      });

      const persister = createHumanPersister<Schemas>(store);
      await persister.load();

      expect(store.getTable("humans")).toEqual({});
    });

    test("skips non-UUID files", async () => {
      const { commands: fsSyncCommands } = await import("@hypr/plugin-fs-sync");

      vi.mocked(fsSyncCommands.readFrontmatterBatch).mockResolvedValue({
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

      const persister = createHumanPersister<Schemas>(store);
      await persister.load();

      const humans = store.getTable("humans");
      expect(Object.keys(humans)).toHaveLength(1);
      expect(humans[TEST_UUID_1]).toBeDefined();
    });
  });

  describe("save", () => {
    test("saves humans to markdown files via frontmatter plugin", async () => {
      const { mkdir } = await import("@tauri-apps/plugin-fs");
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

      const persister = createHumanPersister<Schemas>(store);
      await persister.save();

      expect(mkdir).toHaveBeenCalledWith(`${MOCK_DATA_DIR}/humans`, {
        recursive: true,
      });

      expect(fsSyncCommands.writeFrontmatterBatch).toHaveBeenCalledWith([
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

      const persister = createHumanPersister<Schemas>(store);
      await persister.save();

      expect(fsSyncCommands.writeFrontmatterBatch).not.toHaveBeenCalled();
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

      const persister = createHumanPersister<Schemas>(store);
      await persister.save();

      expect(fsSyncCommands.writeFrontmatterBatch).toHaveBeenCalledTimes(1);

      const batchItems = vi.mocked(fsSyncCommands.writeFrontmatterBatch).mock
        .calls[0][0];
      expect(batchItems).toHaveLength(2);

      const paths = batchItems.map((item: [unknown, string]) => item[1]);
      expect(paths).toContain(`${MOCK_DATA_DIR}/humans/${TEST_UUID_1}.md`);
      expect(paths).toContain(`${MOCK_DATA_DIR}/humans/${TEST_UUID_2}.md`);
    });
  });

  describe("migration", () => {
    test("migrates from humans.json when it exists and humans dir does not", async () => {
      const { exists, readTextFile, mkdir, remove } =
        await import("@tauri-apps/plugin-fs");
      const { commands: fsSyncCommands } = await import("@hypr/plugin-fs-sync");

      vi.mocked(exists).mockImplementation(async (path: string | URL) => {
        const p = typeof path === "string" ? path : path.toString();
        if (p.endsWith("humans.json")) return true;
        if (p.endsWith("humans")) return false;
        return false;
      });

      const mockJsonData = {
        [TEST_UUID_1]: {
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
      vi.mocked(readTextFile).mockResolvedValue(JSON.stringify(mockJsonData));

      const persister = createHumanPersister<Schemas>(store);
      await persister.load();

      expect(mkdir).toHaveBeenCalledWith(`${MOCK_DATA_DIR}/humans`, {
        recursive: true,
      });
      expect(fsSyncCommands.writeFrontmatterBatch).toHaveBeenCalledWith([
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
      expect(remove).toHaveBeenCalledWith(`${MOCK_DATA_DIR}/humans.json`);
    });
  });

  describe("email transform", () => {
    test("loads with emails array (new format)", async () => {
      const { commands: fsSyncCommands } = await import("@hypr/plugin-fs-sync");

      vi.mocked(fsSyncCommands.readFrontmatterBatch).mockResolvedValue({
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

      const persister = createHumanPersister<Schemas>(store);
      await persister.load();

      const humans = store.getTable("humans");
      expect(humans[TEST_UUID_1]?.email).toBe(
        "john@example.com,john.doe@work.com",
      );
    });

    test("loads with legacy email string (backward compat)", async () => {
      const { commands: fsSyncCommands } = await import("@hypr/plugin-fs-sync");

      vi.mocked(fsSyncCommands.readFrontmatterBatch).mockResolvedValue({
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

      const persister = createHumanPersister<Schemas>(store);
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

      const persister = createHumanPersister<Schemas>(store);
      await persister.save();

      const batchItems = vi.mocked(fsSyncCommands.writeFrontmatterBatch).mock
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
