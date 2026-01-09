import { describe, expect, test } from "vitest";

import { createEntityParser } from "./markdown-dir";

describe("createEntityParser", () => {
  describe("humans directory", () => {
    const parser = createEntityParser("humans");

    test("extracts entity id from valid path", () => {
      expect(parser("/data/humans/uuid-123.md")).toBe("uuid-123");
    });

    test("extracts entity id from path with nested directories", () => {
      expect(parser("/some/nested/path/humans/entity-456.md")).toBe(
        "entity-456",
      );
    });

    test("extracts UUID-style entity id", () => {
      expect(
        parser("/data/humans/550e8400-e29b-41d4-a716-446655440000.md"),
      ).toBe("550e8400-e29b-41d4-a716-446655440000");
    });

    test("returns null when directory not in path", () => {
      expect(parser("/data/organizations/uuid-123.md")).toBeNull();
    });

    test("returns null for non-md file", () => {
      expect(parser("/data/humans/uuid-123.json")).toBeNull();
    });

    test("returns null for directory path without filename", () => {
      expect(parser("/data/humans/")).toBeNull();
    });

    test("returns null when directory is last element", () => {
      expect(parser("/data/humans")).toBeNull();
    });

    test("returns null for empty path", () => {
      expect(parser("")).toBeNull();
    });
  });

  describe("prompts directory", () => {
    const parser = createEntityParser("prompts");

    test("extracts entity id from prompts path", () => {
      expect(parser("/data/prompts/summary-prompt.md")).toBe("summary-prompt");
    });

    test("returns null for humans path", () => {
      expect(parser("/data/humans/uuid-123.md")).toBeNull();
    });
  });

  describe("organizations directory", () => {
    const parser = createEntityParser("organizations");

    test("extracts entity id from organizations path", () => {
      expect(parser("/data/organizations/acme-corp.md")).toBe("acme-corp");
    });

    test("handles filename with dots", () => {
      expect(parser("/data/organizations/acme.corp.inc.md")).toBe(
        "acme.corp.inc",
      );
    });
  });

  describe("edge cases", () => {
    const parser = createEntityParser("entities");

    test("handles path with only directory name", () => {
      expect(parser("entities")).toBeNull();
    });

    test("handles path with directory name as filename", () => {
      expect(parser("/data/entities/entities.md")).toBe("entities");
    });

    test("uses first occurrence of directory name (returns null if next element is not .md)", () => {
      expect(parser("/entities/entities/test.md")).toBeNull();
    });

    test("handles filename with special characters", () => {
      expect(parser("/data/entities/test-file_name.md")).toBe("test-file_name");
    });

    test("extracts .md file even in nested path (not a directory check)", () => {
      expect(parser("/data/entities/subdir.md/file.txt")).toBe("subdir");
    });
  });
});
