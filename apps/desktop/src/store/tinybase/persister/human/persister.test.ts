import { createMergeableStore } from "tinybase/with-schemas";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { SCHEMA, type Schemas } from "@hypr/store";

import { createHumanPersister } from "./persister";
import {
  parseMarkdownWithFrontmatter,
  serializeMarkdownWithFrontmatter,
} from "./utils";

vi.mock("@hypr/plugin-path2", () => ({
  commands: {
    base: vi.fn().mockResolvedValue("/mock/data/dir/hyprnote"),
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

      vi.mocked(exists).mockResolvedValue(false);
      vi.mocked(readDir).mockResolvedValue([
        { name: `${HUMAN_UUID_1}.md`, isDirectory: false },
      ]);

      const mockMdContent = serializeMarkdownWithFrontmatter(
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

      vi.mocked(exists).mockResolvedValue(false);
      vi.mocked(readDir).mockResolvedValue([
        { name: "not-a-uuid.md", isDirectory: false },
        { name: `${HUMAN_UUID_1}.md`, isDirectory: false },
      ]);

      const mockMdContent = serializeMarkdownWithFrontmatter(
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

      const persister = createHumanPersister<Schemas>(store);
      await persister.load();

      const humans = store.getTable("humans");
      expect(Object.keys(humans)).toHaveLength(1);
      expect(humans[HUMAN_UUID_1]).toBeDefined();
    });
  });

  describe("save", () => {
    test("saves humans to markdown files", async () => {
      const { writeTextFile, mkdir } = await import("@tauri-apps/plugin-fs");

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

      expect(writeTextFile).toHaveBeenCalledWith(
        `/mock/data/dir/hyprnote/humans/${HUMAN_UUID_1}.md`,
        expect.any(String),
      );

      const writtenContent = vi.mocked(writeTextFile).mock.calls[0][1];
      const { frontmatter, body } =
        parseMarkdownWithFrontmatter(writtenContent);

      expect(frontmatter).toEqual({
        user_id: "user-1",
        created_at: "2024-01-01T00:00:00Z",
        name: "John Doe",
        email: "john@example.com",
        org_id: "org-1",
        job_title: "Engineer",
        linkedin_username: "johndoe",
      });
      expect(body).toBe("Some notes");
    });

    test("does not write when no humans exist", async () => {
      const { writeTextFile } = await import("@tauri-apps/plugin-fs");

      const persister = createHumanPersister<Schemas>(store);
      await persister.save();

      expect(writeTextFile).not.toHaveBeenCalled();
    });

    test("saves multiple humans to separate files", async () => {
      const { writeTextFile } = await import("@tauri-apps/plugin-fs");

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

      expect(writeTextFile).toHaveBeenCalledTimes(2);

      const writtenPaths = vi
        .mocked(writeTextFile)
        .mock.calls.map((call) => call[0]);
      expect(writtenPaths).toContain(
        `/mock/data/dir/hyprnote/humans/${HUMAN_UUID_1}.md`,
      );
      expect(writtenPaths).toContain(
        `/mock/data/dir/hyprnote/humans/${HUMAN_UUID_2}.md`,
      );
    });
  });

  describe("migration", () => {
    test("migrates from humans.json when it exists and humans dir does not", async () => {
      const { exists, readTextFile, writeTextFile, mkdir, remove } =
        await import("@tauri-apps/plugin-fs");

      vi.mocked(exists).mockImplementation(async (path: string) => {
        if (path.endsWith("humans.json")) return true;
        if (path.endsWith("humans")) return false;
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
      expect(writeTextFile).toHaveBeenCalledWith(
        `/mock/data/dir/hyprnote/humans/${HUMAN_UUID_1}.md`,
        expect.any(String),
      );
      expect(remove).toHaveBeenCalledWith(
        "/mock/data/dir/hyprnote/humans.json",
      );
    });
  });
});

describe("utils", () => {
  describe("parseMarkdownWithFrontmatter", () => {
    test("parses markdown with frontmatter", () => {
      const content = `---
name: John Doe
email: john@example.com
---

Some notes about John`;

      const { frontmatter, body } = parseMarkdownWithFrontmatter(content);

      expect(frontmatter).toEqual({
        name: "John Doe",
        email: "john@example.com",
      });
      expect(body).toBe("Some notes about John");
    });

    test("returns empty frontmatter for content without frontmatter", () => {
      const content = "Just some text without frontmatter";

      const { frontmatter, body } = parseMarkdownWithFrontmatter(content);

      expect(frontmatter).toEqual({});
      expect(body).toBe("Just some text without frontmatter");
    });
  });

  describe("serializeMarkdownWithFrontmatter", () => {
    test("serializes frontmatter and body", () => {
      const frontmatter = { name: "John Doe", email: "john@example.com" };
      const body = "Some notes";

      const result = serializeMarkdownWithFrontmatter(frontmatter, body);

      expect(result).toContain("---");
      expect(result).toContain("name: John Doe");
      expect(result).toContain("email: john@example.com");
      expect(result).toContain("Some notes");
    });
  });
});
