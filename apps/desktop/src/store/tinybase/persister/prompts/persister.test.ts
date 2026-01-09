import { beforeEach, describe, expect, test, vi } from "vitest";

import {
  createTestStore,
  MOCK_DATA_DIR,
  setupMarkdownDirPersisterMocks,
  TEST_UUID_1,
  TEST_UUID_2,
} from "../testing/mocks";
import { createPromptPersister } from "./persister";

setupMarkdownDirPersisterMocks();

describe("createPromptPersister", () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
    vi.clearAllMocks();
  });

  test("returns a persister object with expected methods", () => {
    const persister = createPromptPersister(store);

    expect(persister).toBeDefined();
    expect(persister.save).toBeTypeOf("function");
    expect(persister.load).toBeTypeOf("function");
    expect(persister.destroy).toBeTypeOf("function");
  });

  describe("load", () => {
    test("loads prompts from markdown files", async () => {
      const { commands: fsSyncCommands } = await import("@hypr/plugin-fs-sync");

      vi.mocked(fsSyncCommands.readDocumentBatch).mockResolvedValue({
        status: "ok",
        data: {
          [TEST_UUID_1]: {
            frontmatter: {
              user_id: "user-1",
              created_at: "2024-01-01T00:00:00Z",
              task_type: "summary",
            },
            content: "Generate a summary of the meeting",
          },
        },
      });

      const persister = createPromptPersister(store);
      await persister.load();

      expect(fsSyncCommands.readDocumentBatch).toHaveBeenCalledWith(
        `${MOCK_DATA_DIR}/prompts`,
      );

      const prompts = store.getTable("prompts");
      expect(prompts[TEST_UUID_1]).toEqual({
        user_id: "user-1",
        created_at: "2024-01-01T00:00:00Z",
        task_type: "summary",
        content: "Generate a summary of the meeting",
      });
    });

    test("returns empty prompts when directory does not exist", async () => {
      const { commands: fsSyncCommands } = await import("@hypr/plugin-fs-sync");

      vi.mocked(fsSyncCommands.readDocumentBatch).mockResolvedValue({
        status: "error",
        error: "No such file or directory",
      });

      const persister = createPromptPersister(store);
      await persister.load();

      expect(store.getTable("prompts")).toEqual({});
    });
  });

  describe("save", () => {
    test("saves prompts to markdown files via frontmatter plugin", async () => {
      const { commands: fsSyncCommands } = await import("@hypr/plugin-fs-sync");

      store.setRow("prompts", TEST_UUID_1, {
        user_id: "user-1",
        created_at: "2024-01-01T00:00:00Z",
        task_type: "summary",
        content: "Generate a summary of the meeting",
      });

      const persister = createPromptPersister(store);
      await persister.save();

      expect(fsSyncCommands.writeDocumentBatch).toHaveBeenCalledWith([
        [
          {
            frontmatter: {
              user_id: "user-1",
              created_at: "2024-01-01T00:00:00Z",
              task_type: "summary",
            },
            content: "Generate a summary of the meeting",
          },
          `${MOCK_DATA_DIR}/prompts/${TEST_UUID_1}.md`,
        ],
      ]);
    });

    test("does not write when no prompts exist", async () => {
      const { commands: fsSyncCommands } = await import("@hypr/plugin-fs-sync");

      const persister = createPromptPersister(store);
      await persister.save();

      expect(fsSyncCommands.writeDocumentBatch).not.toHaveBeenCalled();
    });

    test("saves multiple prompts in single batch call", async () => {
      const { commands: fsSyncCommands } = await import("@hypr/plugin-fs-sync");

      store.setRow("prompts", TEST_UUID_1, {
        user_id: "user-1",
        created_at: "2024-01-01T00:00:00Z",
        task_type: "summary",
        content: "Summary prompt",
      });

      store.setRow("prompts", TEST_UUID_2, {
        user_id: "user-1",
        created_at: "2024-01-02T00:00:00Z",
        task_type: "action_items",
        content: "Action items prompt",
      });

      const persister = createPromptPersister(store);
      await persister.save();

      expect(fsSyncCommands.writeDocumentBatch).toHaveBeenCalledTimes(1);

      const batchItems = vi.mocked(fsSyncCommands.writeDocumentBatch).mock
        .calls[0][0];
      expect(batchItems).toHaveLength(2);

      const paths = batchItems.map((item: [unknown, string]) => item[1]);
      expect(paths).toContain(`${MOCK_DATA_DIR}/prompts/${TEST_UUID_1}.md`);
      expect(paths).toContain(`${MOCK_DATA_DIR}/prompts/${TEST_UUID_2}.md`);
    });
  });

  describe("migration", () => {
    test("migrates from prompts.json when it exists and prompts dir does not", async () => {
      const { exists, readTextFile, mkdir, remove } =
        await import("@tauri-apps/plugin-fs");
      const { commands: fsSyncCommands } = await import("@hypr/plugin-fs-sync");

      vi.mocked(exists).mockImplementation(async (path: string | URL) => {
        const p = typeof path === "string" ? path : path.toString();
        if (p.endsWith("prompts.json")) return true;
        if (p.endsWith("prompts")) return false;
        return false;
      });

      const mockJsonData = {
        [TEST_UUID_1]: {
          user_id: "user-1",
          created_at: "2024-01-01T00:00:00Z",
          task_type: "summary",
          content: "Generate a summary",
        },
      };
      vi.mocked(readTextFile).mockResolvedValue(JSON.stringify(mockJsonData));

      const persister = createPromptPersister(store);
      await persister.load();

      expect(mkdir).toHaveBeenCalledWith(`${MOCK_DATA_DIR}/prompts`, {
        recursive: true,
      });
      expect(fsSyncCommands.writeDocumentBatch).toHaveBeenCalledWith([
        [
          {
            frontmatter: {
              user_id: "user-1",
              created_at: "2024-01-01T00:00:00Z",
              task_type: "summary",
            },
            content: "Generate a summary",
          },
          `${MOCK_DATA_DIR}/prompts/${TEST_UUID_1}.md`,
        ],
      ]);
      expect(remove).toHaveBeenCalledWith(`${MOCK_DATA_DIR}/prompts.json`);
    });
  });
});
