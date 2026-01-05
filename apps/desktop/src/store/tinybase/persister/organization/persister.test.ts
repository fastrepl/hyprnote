import { createMergeableStore } from "tinybase/with-schemas";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { SCHEMA, type Schemas } from "@hypr/store";

import { createOrganizationPersister } from "./persister";
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
    cleanupOrphanFiles: vi
      .fn()
      .mockResolvedValue({ status: "ok", data: 0 }),
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

const ORG_UUID_1 = "550e8400-e29b-41d4-a716-446655440000";
const ORG_UUID_2 = "550e8400-e29b-41d4-a716-446655440001";

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
    test("loads organizations from markdown files", async () => {
      const { commands: fsSyncCommands } = await import("@hypr/plugin-fs-sync");

      vi.mocked(fsSyncCommands.readFrontmatterBatch).mockResolvedValue({
        status: "ok",
        data: {
          [ORG_UUID_1]: {
            frontmatter: {
              created_at: "2024-01-01T00:00:00Z",
              name: "Acme Corp",
              user_id: "user-1",
            },
            content: "",
          },
        },
      });

      const persister = createOrganizationPersister<Schemas>(store);
      await persister.load();

      expect(fsSyncCommands.readFrontmatterBatch).toHaveBeenCalledWith(
        "/mock/data/dir/hyprnote/organizations",
      );

      const organizations = store.getTable("organizations");
      expect(organizations[ORG_UUID_1]).toEqual({
        user_id: "user-1",
        created_at: "2024-01-01T00:00:00Z",
        name: "Acme Corp",
      });
    });

    test("returns empty organizations when directory does not exist", async () => {
      const { commands: fsSyncCommands } = await import("@hypr/plugin-fs-sync");

      vi.mocked(fsSyncCommands.readFrontmatterBatch).mockResolvedValue({
        status: "error",
        error: "No such file or directory",
      });

      const persister = createOrganizationPersister<Schemas>(store);
      await persister.load();

      expect(store.getTable("organizations")).toEqual({});
    });

    test("skips non-UUID files", async () => {
      const { commands: fsSyncCommands } = await import("@hypr/plugin-fs-sync");

      vi.mocked(fsSyncCommands.readFrontmatterBatch).mockResolvedValue({
        status: "ok",
        data: {
          [ORG_UUID_1]: {
            frontmatter: {
              created_at: "2024-01-01T00:00:00Z",
              name: "Acme Corp",
              user_id: "user-1",
            },
            content: "",
          },
        },
      });

      const persister = createOrganizationPersister<Schemas>(store);
      await persister.load();

      const organizations = store.getTable("organizations");
      expect(Object.keys(organizations)).toHaveLength(1);
      expect(organizations[ORG_UUID_1]).toBeDefined();
    });
  });

  describe("save", () => {
    test("saves organizations to markdown files via frontmatter plugin", async () => {
      const { mkdir } = await import("@tauri-apps/plugin-fs");
      const { commands: fsSyncCommands } = await import("@hypr/plugin-fs-sync");

      store.setRow("organizations", ORG_UUID_1, {
        user_id: "user-1",
        created_at: "2024-01-01T00:00:00Z",
        name: "Acme Corp",
      });

      const persister = createOrganizationPersister<Schemas>(store);
      await persister.save();

      expect(mkdir).toHaveBeenCalledWith(
        "/mock/data/dir/hyprnote/organizations",
        {
          recursive: true,
        },
      );

      expect(fsSyncCommands.writeFrontmatterBatch).toHaveBeenCalledWith([
        [
          {
            frontmatter: {
              created_at: "2024-01-01T00:00:00Z",
              name: "Acme Corp",
              user_id: "user-1",
            },
            content: "",
          },
          `/mock/data/dir/hyprnote/organizations/${ORG_UUID_1}.md`,
        ],
      ]);
    });

    test("does not write when no organizations exist", async () => {
      const { commands: fsSyncCommands } = await import("@hypr/plugin-fs-sync");

      const persister = createOrganizationPersister<Schemas>(store);
      await persister.save();

      expect(fsSyncCommands.writeFrontmatterBatch).not.toHaveBeenCalled();
    });

    test("saves multiple organizations in single batch call", async () => {
      const { commands: fsSyncCommands } = await import("@hypr/plugin-fs-sync");

      store.setRow("organizations", ORG_UUID_1, {
        user_id: "user-1",
        created_at: "2024-01-01T00:00:00Z",
        name: "Acme Corp",
      });

      store.setRow("organizations", ORG_UUID_2, {
        user_id: "user-1",
        created_at: "2024-01-02T00:00:00Z",
        name: "Beta Inc",
      });

      const persister = createOrganizationPersister<Schemas>(store);
      await persister.save();

      expect(fsSyncCommands.writeFrontmatterBatch).toHaveBeenCalledTimes(1);

      const batchItems = vi.mocked(fsSyncCommands.writeFrontmatterBatch).mock
        .calls[0][0];
      expect(batchItems).toHaveLength(2);

      const paths = batchItems.map((item: [unknown, string]) => item[1]);
      expect(paths).toContain(
        `/mock/data/dir/hyprnote/organizations/${ORG_UUID_1}.md`,
      );
      expect(paths).toContain(
        `/mock/data/dir/hyprnote/organizations/${ORG_UUID_2}.md`,
      );
    });
  });

  describe("migration", () => {
    test("migrates from organizations.json when it exists and organizations dir does not", async () => {
      const { exists, readTextFile, mkdir, remove } =
        await import("@tauri-apps/plugin-fs");
      const { commands: fsSyncCommands } = await import("@hypr/plugin-fs-sync");

      vi.mocked(exists).mockImplementation(async (path: string | URL) => {
        const p = typeof path === "string" ? path : path.toString();
        if (p.endsWith("organizations.json")) return true;
        if (p.endsWith("organizations")) return false;
        return false;
      });

      const mockJsonData = {
        [ORG_UUID_1]: {
          user_id: "user-1",
          created_at: "2024-01-01T00:00:00Z",
          name: "Acme Corp",
        },
      };
      vi.mocked(readTextFile).mockResolvedValue(JSON.stringify(mockJsonData));

      const persister = createOrganizationPersister<Schemas>(store);
      await persister.load();

      expect(mkdir).toHaveBeenCalledWith(
        "/mock/data/dir/hyprnote/organizations",
        {
          recursive: true,
        },
      );
      expect(fsSyncCommands.writeFrontmatterBatch).toHaveBeenCalledWith([
        [
          {
            frontmatter: {
              created_at: "2024-01-01T00:00:00Z",
              name: "Acme Corp",
              user_id: "user-1",
            },
            content: "",
          },
          `/mock/data/dir/hyprnote/organizations/${ORG_UUID_1}.md`,
        ],
      ]);
      expect(remove).toHaveBeenCalledWith(
        "/mock/data/dir/hyprnote/organizations.json",
      );
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
            name: "Acme Corp",
            user_id: "user-1",
          },
          content: "",
        },
      });

      const content = `---
name: Acme Corp
user_id: user-1
---

`;

      const { frontmatter, body } = await parseMarkdownWithFrontmatter(content);

      expect(frontmatter).toEqual({
        name: "Acme Corp",
        user_id: "user-1",
      });
      expect(body).toBe("");
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
