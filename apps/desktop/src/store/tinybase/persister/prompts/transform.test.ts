import { describe, expect, test } from "vitest";

import { frontmatterToPrompt, promptToFrontmatter } from "./transform";

describe("frontmatterToPrompt", () => {
  test("converts frontmatter and body to prompt storage", () => {
    const result = frontmatterToPrompt(
      {
        user_id: "user-1",
        task_type: "summary",
      },
      "Generate a summary",
    );
    expect(result).toEqual({
      user_id: "user-1",
      task_type: "summary",
      content: "Generate a summary",
    });
  });

  test("handles missing fields", () => {
    const result = frontmatterToPrompt({}, "Content only");
    expect(result).toEqual({
      user_id: "",
      task_type: "",
      content: "Content only",
    });
  });
});

describe("promptToFrontmatter", () => {
  test("converts prompt storage to frontmatter and body", () => {
    const result = promptToFrontmatter({
      user_id: "user-1",
      task_type: "summary",
      content: "Generate a summary",
    });
    expect(result).toEqual({
      frontmatter: {
        user_id: "user-1",
        task_type: "summary",
      },
      body: "Generate a summary",
    });
  });

  test("handles empty content", () => {
    const result = promptToFrontmatter({
      user_id: "user-1",
      task_type: "summary",
      content: "",
    });
    expect(result.body).toBe("");
  });
});
