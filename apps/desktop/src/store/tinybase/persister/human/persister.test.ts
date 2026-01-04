import { createMergeableStore } from "tinybase/with-schemas";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { SCHEMA, type Schemas } from "@hypr/store";

import { createHumanPersister } from "./persister";
import { parseMarkdownWithFrontmatter } from "./utils";

vi.mock("@hypr/plugin-path2", () => ({
  commands: {
    base: vi.fn().mockResolvedValue("/mock/data/dir/hyprnote"),
  },
}));

vi.mock("@hypr/plugin-frontmatter", () => ({
  commands: {
    deserialize: vi.fn(),
    serialize: vi.fn().mockResolvedValue({ status: "ok", data: "" }),
    serializeBatch: vi.fn().mockResolvedValue({ status: "ok", data: null }),
  },
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  readDir: vi.fn(),
  readTextFile: vi.fn(),
  writeTextFile: vi.fn().mockResolvedValue(undefined),
  exists: vi.fn(),
  remove: vi.fn().mockResolvedValue(undefined),
}));

function serializeFrontmatterSync(
  frontmatter: Record<string, unknown>,
  body: string,
): string {
  const lines = Object.entries(frontmatter).map(([k, v]) => `${k}: ${v}`);
  return `---\n${lines.join("\n")}\n---\n\n${body}`;
}

function createTestStore() {
  return createMergeableStore()
    .setTablesSchema(SCHEMA.table)
    .setValuesSchema(SCHEMA.value);
}

const HUMAN_UUID_1 = "550e8400-e29b-41d4-a716-446655440000";
const HUMAN_UUID_2 = "550e8400-e29b-41d4-a716-446655440001";

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
      const { readDir, readTextFile, exists } =
        await import("@tauri-apps/plugin-fs");
      const { commands: frontmatterCommands } =
        await import("@hypr/plugin-frontmatter");

      vi.mocked(exists).mockResolvedValue(false);
      vi.mocked(readDir).mockResolvedValue([
        {
          name: `${HUMAN_UUID_1}.md`,
          isDirectory: false,
          isFile: true,
          isSymlink: false,
        },
      ]);

      const mockMdContent = serializeFrontmatterSync(
        {
          user_id: "user-1",
          created_at: "2024-01-01T00:00:00Z",
          name: "John Doe",
          email: "john@example.com",
          org_id: "org-1",
          job_title: "Engineer",
          linkedin_username: "johndoe",
        },
        "Some notes",
      );
      vi.mocked(readTextFile).mockResolvedValue(mockMdContent);
      vi.mocked(frontmatterCommands.deserialize).mockResolvedValue({
        status: "ok",
        data: {
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
      });

      const persister = createHumanPersister<Schemas>(store);
      await persister.load();

      expect(readDir).toHaveBeenCalledWith("/mock/data/dir/hyprnote/humans");

      const humans = store.getTable("humans");
      expect(humans[HUMAN_UUID_1]).toEqual({
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
      const { readDir, exists } = await import("@tauri-apps/plugin-fs");

      vi.mocked(exists).mockResolvedValue(false);
      vi.mocked(readDir).mockRejectedValue(
        new Error("No such file or directory"),
      );

      const persister = createHumanPersister<Schemas>(store);
      await persister.load();

      expect(store.getTable("humans")).toEqual({});
    });

    test("skips non-UUID files", async () => {
      const { readDir, readTextFile, exists } =
        await import("@tauri-apps/plugin-fs");
      const { commands: frontmatterCommands } =
        await import("@hypr/plugin-frontmatter");

      vi.mocked(exists).mockResolvedValue(false);
      vi.mocked(readDir).mockResolvedValue([
        {
          name: "not-a-uuid.md",
          isDirectory: false,
          isFile: true,
          isSymlink: false,
        },
        {
          name: `${HUMAN_UUID_1}.md`,
          isDirectory: false,
          isFile: true,
          isSymlink: false,
        },
      ]);

      const mockMdContent = serializeFrontmatterSync(
        {
          user_id: "user-1",
          created_at: "2024-01-01T00:00:00Z",
          name: "John Doe",
          email: "john@example.com",
          org_id: "",
          job_title: "",
          linkedin_username: "",
        },
        "",
      );
      vi.mocked(readTextFile).mockResolvedValue(mockMdContent);
      vi.mocked(frontmatterCommands.deserialize).mockResolvedValue({
        status: "ok",
        data: {
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
      });

      const persister = createHumanPersister<Schemas>(store);
      await persister.load();

      const humans = store.getTable("humans");
      expect(Object.keys(humans)).toHaveLength(1);
      expect(humans[HUMAN_UUID_1]).toBeDefined();
    });
  });

  describe("save", () => {
    test("saves humans to markdown files via frontmatter plugin", async () => {
      const { mkdir } = await import("@tauri-apps/plugin-fs");
      const { commands: frontmatterCommands } =
        await import("@hypr/plugin-frontmatter");

      store.setRow("humans", HUMAN_UUID_1, {
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

      expect(mkdir).toHaveBeenCalledWith("/mock/data/dir/hyprnote/humans", {
        recursive: true,
      });

      expect(frontmatterCommands.serializeBatch).toHaveBeenCalledWith([
        [
          {
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
          `/mock/data/dir/hyprnote/humans/${HUMAN_UUID_1}.md`,
        ],
      ]);
    });

    test("does not write when no humans exist", async () => {
      const { commands: frontmatterCommands } =
        await import("@hypr/plugin-frontmatter");

      const persister = createHumanPersister<Schemas>(store);
      await persister.save();

      expect(frontmatterCommands.serializeBatch).not.toHaveBeenCalled();
    });

    test("saves multiple humans in single batch call", async () => {
      const { commands: frontmatterCommands } =
        await import("@hypr/plugin-frontmatter");

      store.setRow("humans", HUMAN_UUID_1, {
        user_id: "user-1",
        created_at: "2024-01-01T00:00:00Z",
        name: "John Doe",
        email: "john@example.com",
        org_id: "org-1",
        job_title: "Engineer",
        linkedin_username: "johndoe",
        memo: "",
      });

      store.setRow("humans", HUMAN_UUID_2, {
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

      expect(frontmatterCommands.serializeBatch).toHaveBeenCalledTimes(1);

      const batchItems = vi.mocked(frontmatterCommands.serializeBatch).mock
        .calls[0][0];
      expect(batchItems).toHaveLength(2);

      const paths = batchItems.map((item: [unknown, string]) => item[1]);
      expect(paths).toContain(
        `/mock/data/dir/hyprnote/humans/${HUMAN_UUID_1}.md`,
      );
      expect(paths).toContain(
        `/mock/data/dir/hyprnote/humans/${HUMAN_UUID_2}.md`,
      );
    });
  });

  describe("migration", () => {
    test("migrates from humans.json when it exists and humans dir does not", async () => {
      const { exists, readTextFile, mkdir, remove } =
        await import("@tauri-apps/plugin-fs");
      const { commands: frontmatterCommands } =
        await import("@hypr/plugin-frontmatter");

      vi.mocked(exists).mockImplementation(async (path: string | URL) => {
        const p = typeof path === "string" ? path : path.toString();
        if (p.endsWith("humans.json")) return true;
        if (p.endsWith("humans")) return false;
        return false;
      });

      const mockJsonData = {
        [HUMAN_UUID_1]: {
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

      expect(mkdir).toHaveBeenCalledWith("/mock/data/dir/hyprnote/humans", {
        recursive: true,
      });
      expect(frontmatterCommands.serializeBatch).toHaveBeenCalledWith([
        [
          {
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
          `/mock/data/dir/hyprnote/humans/${HUMAN_UUID_1}.md`,
        ],
      ]);
      expect(remove).toHaveBeenCalledWith(
        "/mock/data/dir/hyprnote/humans.json",
      );
    });
  });
});

describe("utils", () => {
  describe("parseMarkdownWithFrontmatter", () => {
    test("parses markdown with frontmatter via plugin", async () => {
      const { commands: frontmatterCommands } =
        await import("@hypr/plugin-frontmatter");

      vi.mocked(frontmatterCommands.deserialize).mockResolvedValue({
        status: "ok",
        data: {
          frontmatter: {
            name: "John Doe",
            email: "john@example.com",
          },
          content: "Some notes about John",
        },
      });

      const content = `---
name: John Doe
email: john@example.com
---

Some notes about John`;

      const { frontmatter, body } = await parseMarkdownWithFrontmatter(content);

      expect(frontmatter).toEqual({
        name: "John Doe",
        email: "john@example.com",
      });
      expect(body).toBe("Some notes about John");
    });

    test("returns empty frontmatter when plugin returns error", async () => {
      const { commands: frontmatterCommands } =
        await import("@hypr/plugin-frontmatter");

      vi.mocked(frontmatterCommands.deserialize).mockResolvedValue({
        status: "error",
        error: "Parse error",
      });

      const content = "Just some text without frontmatter";

      const { frontmatter, body } = await parseMarkdownWithFrontmatter(content);

      expect(frontmatter).toEqual({});
      expect(body).toBe("Just some text without frontmatter");
    });
  });
});
