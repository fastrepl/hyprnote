import type { TextStreamPart } from "ai";
import { describe, expect, it } from "vitest";
import { markdownTransform } from "./ai";

describe("markdownTransform", () => {
  it("should unwrap single code block with md language", async () => {
    const results = await runTransform(["```md\n# Hello\n```"]);
    expect(results.join("")).toEqual("# Hello\n");
  });

  it("should unwrap single code block with markdown language", async () => {
    const results = await runTransform(["```markdown\n# Hello\n```"]);
    expect(results.join("")).toEqual("# Hello\n");
  });

  it("should unwrap multiple code blocks", async () => {
    const input = [
      "this is text\n\n",
      "```md\n",
      "123\n",
      "```\n\n",
      "```py\n",
      "a = 1\n",
      "```\n\n",
      "Done",
    ];
    const results = await runTransform(input);
    expect(results.join("")).toEqual("this is text\n\n123\n\na = 1\n\nDone");
  });

  it("should handle code blocks split across chunks", async () => {
    const results = await runTransform([
      "text\n",
      "``",
      "`md\n",
      "content\n",
      "``",
      "`",
    ]);
    expect(results.join("")).toEqual("text\ncontent\n");
  });

  it("should preserve content outside code blocks", async () => {
    const results = await runTransform(["Hello\n```js\ncode\n```\nWorld"]);
    expect(results.join("")).toEqual("Hello\ncode\nWorld");
  });

  it("should handle empty code blocks", async () => {
    const results = await runTransform(["```\n```"]);
    expect(results.join("")).toEqual("");
  });

  it("should handle code blocks with no closing fence", async () => {
    const results = await runTransform(["```md\ncontent"]);
    expect(results.join("")).toEqual("content");
  });

  it("should handle nested backticks inside code blocks", async () => {
    const results = await runTransform([
      "```md\n",
      "Here's some `inline code`\n",
      "```",
    ]);
    expect(results.join("")).toEqual("Here's some `inline code`\n");
  });

  it("should handle code fence with extra content on same line", async () => {
    const results = await runTransform(["```javascript const x = 1\nmore code\n```"]);
    expect(results.join("")).toEqual("more code\n");
  });

  it("should handle multiple code blocks in single chunk", async () => {
    const results = await runTransform([
      "start\n```py\ncode1\n```\nmiddle\n```js\ncode2\n```\nend",
    ]);
    expect(results.join("")).toEqual("start\ncode1\nmiddle\ncode2\nend");
  });

  it("should handle code blocks without language specifier", async () => {
    const results = await runTransform(["```\nplain code\n```"]);
    expect(results.join("")).toEqual("plain code\n");
  });

  it("should preserve indentation inside code blocks", async () => {
    const results = await runTransform([
      "```py\n",
      "def hello():\n",
      "    print('world')\n",
      "```",
    ]);
    expect(results.join("")).toEqual("def hello():\n    print('world')\n");
  });
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
    await writer.write(
      {
        type: "text-delta",
        textDelta: input,
      } satisfies TextStreamPart<{}>,
    );
  }
  await writer.close();

  await readerPromise;

  return results;
};
