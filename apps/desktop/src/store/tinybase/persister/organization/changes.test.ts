import { describe, expect, test } from "vitest";

import { parseOrganizationIdFromPath } from "./changes";

describe("parseOrganizationIdFromPath", () => {
  test("parses id from valid path", () => {
    expect(parseOrganizationIdFromPath("organizations/acme-corp.md")).toBe(
      "acme-corp",
    );
  });

  test("parses id from path with leading segments", () => {
    expect(
      parseOrganizationIdFromPath("/data/hyprnote/organizations/acme-corp.md"),
    ).toBe("acme-corp");
  });

  test("parses uuid from path", () => {
    expect(
      parseOrganizationIdFromPath(
        "organizations/550e8400-e29b-41d4-a716-446655440000.md",
      ),
    ).toBe("550e8400-e29b-41d4-a716-446655440000");
  });

  test("returns null for non-markdown file", () => {
    expect(
      parseOrganizationIdFromPath("organizations/acme-corp.json"),
    ).toBeNull();
  });

  test("returns null for wrong directory", () => {
    expect(parseOrganizationIdFromPath("humans/person-123.md")).toBeNull();
  });

  test("returns null for path without filename", () => {
    expect(parseOrganizationIdFromPath("organizations/")).toBeNull();
  });

  test("returns null for directory name only", () => {
    expect(parseOrganizationIdFromPath("organizations")).toBeNull();
  });
});
