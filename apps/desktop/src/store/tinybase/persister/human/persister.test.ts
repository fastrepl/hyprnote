import { createMergeableStore } from "tinybase/with-schemas";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { SCHEMA, type Schemas } from "@hypr/store";

import { createHumanPersister } from "./persister";
import { frontmatterToStore, storeToFrontmatter } from "./transform";
import { parseMarkdownWithFrontmatter } from "./utils";

vi.mock("@hypr/plugin-path2", () => ({
  commands: {
    base: vi.fn().mockResolvedValue("/mock/data/dir/hyprnote"),
  },
}));

vi.mock("@hypr/plugin-fs-sync", () => ({
  commands: {
    deserialize: vi.fn(),
    serialize: vi.fn().mockResolvedValue({ status: "ok", data: "" }),
    writeFrontmatterBatch: vi
      .fn()
      .mockResolvedValue({ status: "ok", data: null }),
    readFrontmatterBatch: vi.fn(),
    cleanupOrphanFiles: vi.fn().mockResolvedValue({ status: "ok", data: 0 }),
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
      const { commands: fsSyncCommands } = await import("@hypr/plugin-fs-sync");

      vi.mocked(fsSyncCommands.readFrontmatterBatch).mockResolvedValue({
        status: "ok",
        data: {
          [HUMAN_UUID_1]: {
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
        "/mock/data/dir/hyprnote/humans",
      );

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
          [HUMAN_UUID_1]: {
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
      expect(humans[HUMAN_UUID_1]).toBeDefined();
    });
  });

  describe("save", () => {
    test("saves humans to markdown files via frontmatter plugin", async () => {
      const { mkdir } = await import("@tauri-apps/plugin-fs");
      const { commands: fsSyncCommands } = await import("@hypr/plugin-fs-sync");

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
          `/mock/data/dir/hyprnote/humans/${HUMAN_UUID_1}.md`,
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

      expect(fsSyncCommands.writeFrontmatterBatch).toHaveBeenCalledTimes(1);

      const batchItems = vi.mocked(fsSyncCommands.writeFrontmatterBatch).mock
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
      const { commands: fsSyncCommands } = await import("@hypr/plugin-fs-sync");

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
          `/mock/data/dir/hyprnote/humans/${HUMAN_UUID_1}.md`,
        ],
      ]);
      expect(remove).toHaveBeenCalledWith(
        "/mock/data/dir/hyprnote/humans.json",
      );
    });
  });

  describe("email transform", () => {
    test("loads with emails array (new format)", async () => {
      const { commands: fsSyncCommands } = await import("@hypr/plugin-fs-sync");

      vi.mocked(fsSyncCommands.readFrontmatterBatch).mockResolvedValue({
        status: "ok",
        data: {
          [HUMAN_UUID_1]: {
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
      expect(humans[HUMAN_UUID_1]?.email).toBe(
        "john@example.com,john.doe@work.com",
      );
    });

    test("loads with legacy email string (backward compat)", async () => {
      const { commands: fsSyncCommands } = await import("@hypr/plugin-fs-sync");

      vi.mocked(fsSyncCommands.readFrontmatterBatch).mockResolvedValue({
        status: "ok",
        data: {
          [HUMAN_UUID_1]: {
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
      expect(humans[HUMAN_UUID_1]?.email).toBe("john@example.com");
    });

    test("saves multiple emails as array", async () => {
      const { commands: fsSyncCommands } = await import("@hypr/plugin-fs-sync");

      store.setRow("humans", HUMAN_UUID_1, {
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

describe("utils", () => {
  describe("parseMarkdownWithFrontmatter", () => {
    test("parses markdown with frontmatter via plugin", async () => {
      const { commands: fsSyncCommands } = await import("@hypr/plugin-fs-sync");

      vi.mocked(fsSyncCommands.deserialize).mockResolvedValue({
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
      const { commands: fsSyncCommands } = await import("@hypr/plugin-fs-sync");

      vi.mocked(fsSyncCommands.deserialize).mockResolvedValue({
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

describe("transform", () => {
  describe("frontmatterToStore", () => {
    test("converts emails array to comma-separated string", () => {
      const result = frontmatterToStore({
        emails: ["a@example.com", "b@example.com"],
      });
      expect(result.email).toBe("a@example.com,b@example.com");
    });

    test("falls back to email string for backward compat", () => {
      const result = frontmatterToStore({ email: "a@example.com" });
      expect(result.email).toBe("a@example.com");
    });

    test("prefers emails array over email string", () => {
      const result = frontmatterToStore({
        emails: ["new@example.com"],
        email: "old@example.com",
      });
      expect(result.email).toBe("new@example.com");
    });

    test("returns empty string when neither exists", () => {
      const result = frontmatterToStore({});
      expect(result.email).toBe("");
    });

    test("trims whitespace and filters empty values", () => {
      const result = frontmatterToStore({
        emails: ["  a@example.com  ", "", "  b@example.com"],
      });
      expect(result.email).toBe("a@example.com,b@example.com");
    });
  });

  describe("storeToFrontmatter", () => {
    test("splits comma-separated string into array", () => {
      const result = storeToFrontmatter({
        email: "a@example.com,b@example.com",
      });
      expect(result.emails).toEqual(["a@example.com", "b@example.com"]);
    });

    test("returns empty array for empty string", () => {
      const result = storeToFrontmatter({ email: "" });
      expect(result.emails).toEqual([]);
    });

    test("trims whitespace and filters empty values", () => {
      const result = storeToFrontmatter({
        email: "  a@example.com  , , b@example.com  ",
      });
      expect(result.emails).toEqual(["a@example.com", "b@example.com"]);
    });

    test("handles single email", () => {
      const result = storeToFrontmatter({ email: "a@example.com" });
      expect(result.emails).toEqual(["a@example.com"]);
    });
  });
});
