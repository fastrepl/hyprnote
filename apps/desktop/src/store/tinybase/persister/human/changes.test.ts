import { describe, expect, test } from "vitest";

import { parseHumanIdFromPath } from "./changes";

describe("parseHumanIdFromPath", () => {
  test("parses id from valid path", () => {
    expect(parseHumanIdFromPath("humans/person-123.md")).toBe("person-123");
  });

  test("parses id from path with leading segments", () => {
    expect(parseHumanIdFromPath("/data/hyprnote/humans/person-123.md")).toBe(
      "person-123",
    );
  });

  test("parses uuid from path", () => {
    expect(
      parseHumanIdFromPath("humans/550e8400-e29b-41d4-a716-446655440000.md"),
    ).toBe("550e8400-e29b-41d4-a716-446655440000");
  });

  test("returns null for non-markdown file", () => {
    expect(parseHumanIdFromPath("humans/person-123.json")).toBeNull();
  });

  test("returns null for wrong directory", () => {
    expect(parseHumanIdFromPath("organizations/org-123.md")).toBeNull();
  });

  test("returns null for path without filename", () => {
    expect(parseHumanIdFromPath("humans/")).toBeNull();
  });

  test("returns null for directory name only", () => {
    expect(parseHumanIdFromPath("humans")).toBeNull();
  });
});
