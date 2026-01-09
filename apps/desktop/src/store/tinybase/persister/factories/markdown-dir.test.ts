import { describe, expect, test } from "vitest";

import { parseHumanIdFromPath } from "../human/changes";
import { parseOrganizationIdFromPath } from "../organization/changes";
import { parsePromptIdFromPath } from "../prompts/changes";

describe("parseHumanIdFromPath", () => {
  test("extracts entity id from valid path", () => {
    expect(parseHumanIdFromPath("/data/humans/uuid-123.md")).toBe("uuid-123");
  });

  test("extracts entity id from path with nested directories", () => {
    expect(parseHumanIdFromPath("/some/nested/path/humans/entity-456.md")).toBe(
      "entity-456",
    );
  });

  test("extracts UUID-style entity id", () => {
    expect(
      parseHumanIdFromPath(
        "/data/humans/550e8400-e29b-41d4-a716-446655440000.md",
      ),
    ).toBe("550e8400-e29b-41d4-a716-446655440000");
  });

  test("returns null when directory not in path", () => {
    expect(parseHumanIdFromPath("/data/organizations/uuid-123.md")).toBeNull();
  });

  test("returns null for non-md file", () => {
    expect(parseHumanIdFromPath("/data/humans/uuid-123.json")).toBeNull();
  });

  test("returns null for directory path without filename", () => {
    expect(parseHumanIdFromPath("/data/humans/")).toBeNull();
  });

  test("returns null when directory is last element", () => {
    expect(parseHumanIdFromPath("/data/humans")).toBeNull();
  });

  test("returns null for empty path", () => {
    expect(parseHumanIdFromPath("")).toBeNull();
  });
});

describe("parsePromptIdFromPath", () => {
  test("extracts entity id from prompts path", () => {
    expect(parsePromptIdFromPath("/data/prompts/summary-prompt.md")).toBe(
      "summary-prompt",
    );
  });

  test("returns null for humans path", () => {
    expect(parsePromptIdFromPath("/data/humans/uuid-123.md")).toBeNull();
  });
});

describe("parseOrganizationIdFromPath", () => {
  test("extracts entity id from organizations path", () => {
    expect(
      parseOrganizationIdFromPath("/data/organizations/acme-corp.md"),
    ).toBe("acme-corp");
  });

  test("handles filename with dots", () => {
    expect(
      parseOrganizationIdFromPath("/data/organizations/acme.corp.inc.md"),
    ).toBe("acme.corp.inc");
  });
});
