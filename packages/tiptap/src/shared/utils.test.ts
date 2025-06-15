import { describe, expect, it } from "vitest";

import { html2md } from "./utils";

// pnpm -F @hypr/tiptap test
describe("html2md", () => {
  it("should not add newlines for p inside li", () => {
    const html = "<ul><li><p>hello</p></li></ul>";
    const expected = "*   hello";
    expect(html2md(html)).toBe(expected);
  });
});
