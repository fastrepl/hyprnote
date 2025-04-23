import type { TextStreamPart } from "ai";
import { describe, expect, it } from "vitest";
import { markdownTransform } from "./ai";

describe("markdownTransform", () => {
  it("should strip ```md prefix", async () => {
    const results = await runTransform(["```md", "# Hello"]);
    expect(results).toEqual(["# Hello"]);
  });

  it("should strip ```markdown prefix", async () => {
    const results = await runTransform(["```markdown", "# Hello"]);
    expect(results).toEqual(["# Hello"]);
  });

  it("should NOT strip # prefix (markdown heading)", async () => {
    const results = await runTransform(["# Hello"]);
    expect(results).toEqual(["# Hello"]);
  });

  it("should handle content with no special prefix", async () => {
    const results = await runTransform(["Hello, world!"]);
    expect(results).toEqual(["Hello, world!"]);
  });

  it("should handle prefixes split across chunks", async () => {
    const results = await runTransform(["``", "`md", "# Hello"]);
    expect(results).toEqual(["# Hello"]);
  });

  it("should handle content after the prefix in the same chunk", async () => {
    const results = await runTransform(["```md# Hello"]);
    expect(results).toEqual(["# Hello"]);
  });

  it("should handle empty input", async () => {
    const results = await runTransform([]);
    expect(results).toEqual([]);
  });

  it("should handle partial prefix that never completes", async () => {
    const results = await runTransform(["```"]);
    expect(results).toEqual(["```"]);
  });

  it("should handle multiple chunks with mixed content", async () => {
    const results = await runTransform(["First chunk", " with more ", "content"]);
    expect(results).toEqual(["First chunk", " with more ", "content"]);
  });

  it("should handle complex markdown content after prefix", async () => {
    const results = await runTransform([
      "```markdown",
      "# Title",
      "",
      "- List item 1",
      "- List item 2",
      "",
      "```js",
      "const code = true;",
      "```",
    ]);
    expect(results).toEqual([
      "# Title",
      "",
      "- List item 1",
      "- List item 2",
      "",
      "```js",
      "const code = true;",
      "```",
    ]);
  });

  it("should handle markdown prefix with newline", async () => {
    const results = await runTransform(["```md\n# Hello"]);
    expect(results).toEqual(["\n# Hello"]);
  });
});

const createTextPart = (text: string): TextStreamPart<{}> => ({
  type: "text-delta",
  textDelta: text,
});

const runTransform = async (inputs: string[]) => {
  const transform = markdownTransform()({ tools: {}, stopStream: () => {} });
  const reader = transform.readable.getReader();
  const writer = transform.writable.getWriter();

  const results: string[] = [];

  const readerPromise = (async () => {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      if (value.type === "text-delta") {
        results.push(value.textDelta);
      }
    }
  })();

  for (const input of inputs) {
    await writer.write(createTextPart(input));
  }
  await writer.close();

  await readerPromise;

  return results;
};
