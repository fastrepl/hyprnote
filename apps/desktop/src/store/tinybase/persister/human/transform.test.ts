import { describe, expect, test } from "vitest";

import { frontmatterToStore, storeToFrontmatter } from "./transform";

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
