import { describe, expect, test } from "vitest";

import {
  frontmatterToOrganization,
  organizationToFrontmatter,
} from "./transform";

describe("frontmatterToOrganization", () => {
  test("converts frontmatter to organization storage", () => {
    const result = frontmatterToOrganization(
      {
        user_id: "user-1",
        name: "Acme Corp",
      },
      "",
    );
    expect(result).toEqual({
      user_id: "user-1",
      name: "Acme Corp",
    });
  });

  test("handles missing fields", () => {
    const result = frontmatterToOrganization({}, "");
    expect(result).toEqual({
      user_id: "",
      name: "",
    });
  });
});

describe("organizationToFrontmatter", () => {
  test("converts organization storage to frontmatter", () => {
    const result = organizationToFrontmatter({
      user_id: "user-1",
      name: "Acme Corp",
    });
    expect(result).toEqual({
      frontmatter: {
        user_id: "user-1",
        name: "Acme Corp",
      },
      body: "",
    });
  });
});
