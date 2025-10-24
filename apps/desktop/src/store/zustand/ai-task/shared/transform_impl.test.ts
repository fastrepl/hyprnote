import type { TextStreamPart, ToolSet } from "ai";
import { beforeEach, describe, expect, it } from "vitest";

import { trimBeforeMarker } from "./transform_impl";

function convertArrayToReadableStream<T>(values: T[]): ReadableStream<T> {
  return new ReadableStream({
    start(controller) {
      for (const value of values) {
        controller.enqueue(value);
      }
      controller.close();
    },
  });
}

describe("trimBeforeMarker", () => {
  let events: any[] = [];

  beforeEach(() => {
    events = [];
  });

  async function consumeStream(stream: ReadableStream<any>) {
    const reader = stream.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      events.push(value);
    }
  }

  it("should trim text before marker (##)", async () => {
    const stream = convertArrayToReadableStream<TextStreamPart<ToolSet>>([
      { type: "text-start", id: "1" },
      { text: "ok. I will give you that! ", type: "text-delta", id: "1" },
      { text: "## Header", type: "text-delta", id: "1" },
      { text: " content", type: "text-delta", id: "1" },
      { type: "text-end", id: "1" },
    ]).pipeThrough(trimBeforeMarker("##")({ tools: {}, stopStream: () => {} }));

    await consumeStream(stream);

    expect(events).toMatchInlineSnapshot(`
      [
        {
          "id": "1",
          "type": "text-start",
        },
        {
          "id": "1",
          "text": "## Header",
          "type": "text-delta",
        },
        {
          "id": "1",
          "text": " content",
          "type": "text-delta",
        },
        {
          "id": "1",
          "type": "text-end",
        },
      ]
    `);
  });

  it("should handle marker split across chunks", async () => {
    const stream = convertArrayToReadableStream<TextStreamPart<ToolSet>>([
      { type: "text-start", id: "1" },
      { text: "ok. I will give you that! #", type: "text-delta", id: "1" },
      { text: "# Header", type: "text-delta", id: "1" },
      { text: " content", type: "text-delta", id: "1" },
      { type: "text-end", id: "1" },
    ]).pipeThrough(trimBeforeMarker("##")({ tools: {}, stopStream: () => {} }));

    await consumeStream(stream);

    expect(events).toMatchInlineSnapshot(`
      [
        {
          "id": "1",
          "type": "text-start",
        },
        {
          "id": "1",
          "text": "## Header",
          "type": "text-delta",
        },
        {
          "id": "1",
          "text": " content",
          "type": "text-delta",
        },
        {
          "id": "1",
          "type": "text-end",
        },
      ]
    `);
  });

  it("should trim before single # when looking for ##", async () => {
    const stream = convertArrayToReadableStream<TextStreamPart<ToolSet>>([
      { type: "text-start", id: "1" },
      { text: "# Wrong header\n", type: "text-delta", id: "1" },
      { text: "## Correct header", type: "text-delta", id: "1" },
      { type: "text-end", id: "1" },
    ]).pipeThrough(trimBeforeMarker("##")({ tools: {}, stopStream: () => {} }));

    await consumeStream(stream);

    expect(events).toMatchInlineSnapshot(`
      [
        {
          "id": "1",
          "type": "text-start",
        },
        {
          "id": "1",
          "text": "## Correct header",
          "type": "text-delta",
        },
        {
          "id": "1",
          "type": "text-end",
        },
      ]
    `);
  });

  it("should handle marker at the very start", async () => {
    const stream = convertArrayToReadableStream<TextStreamPart<ToolSet>>([
      { type: "text-start", id: "1" },
      { text: "## Header", type: "text-delta", id: "1" },
      { text: " content", type: "text-delta", id: "1" },
      { type: "text-end", id: "1" },
    ]).pipeThrough(trimBeforeMarker("##")({ tools: {}, stopStream: () => {} }));

    await consumeStream(stream);

    expect(events).toMatchInlineSnapshot(`
      [
        {
          "id": "1",
          "type": "text-start",
        },
        {
          "id": "1",
          "text": "## Header",
          "type": "text-delta",
        },
        {
          "id": "1",
          "text": " content",
          "type": "text-delta",
        },
        {
          "id": "1",
          "type": "text-end",
        },
      ]
    `);
  });

  it("should send all buffered chunks if marker is never found", async () => {
    const stream = convertArrayToReadableStream<TextStreamPart<ToolSet>>([
      { type: "text-start", id: "1" },
      { text: "No marker here", type: "text-delta", id: "1" },
      { text: " at all", type: "text-delta", id: "1" },
      { type: "text-end", id: "1" },
    ]).pipeThrough(trimBeforeMarker("##")({ tools: {}, stopStream: () => {} }));

    await consumeStream(stream);

    expect(events).toMatchInlineSnapshot(`
      [
        {
          "id": "1",
          "type": "text-start",
        },
        {
          "id": "1",
          "text": "No marker here",
          "type": "text-delta",
        },
        {
          "id": "1",
          "text": " at all",
          "type": "text-delta",
        },
        {
          "id": "1",
          "type": "text-end",
        },
      ]
    `);
  });

  it("should handle non-text-delta chunks before marker is found", async () => {
    const stream = convertArrayToReadableStream<TextStreamPart<ToolSet>>([
      { type: "text-start", id: "1" },
      { text: "prefix ", type: "text-delta", id: "1" },
      {
        type: "tool-call",
        toolCallId: "1",
        toolName: "test",
        input: {},
      },
      { text: "## Header", type: "text-delta", id: "1" },
      { type: "text-end", id: "1" },
    ]).pipeThrough(trimBeforeMarker("##")({ tools: {}, stopStream: () => {} }));

    await consumeStream(stream);

    expect(events).toMatchInlineSnapshot(`
      [
        {
          "input": {},
          "toolCallId": "1",
          "toolName": "test",
          "type": "tool-call",
        },
        {
          "id": "1",
          "type": "text-start",
        },
        {
          "id": "1",
          "text": "## Header",
          "type": "text-delta",
        },
        {
          "id": "1",
          "type": "text-end",
        },
      ]
    `);
  });

  it("should work with custom markers", async () => {
    const stream = convertArrayToReadableStream<TextStreamPart<ToolSet>>([
      { type: "text-start", id: "1" },
      { text: "Some intro text... ", type: "text-delta", id: "1" },
      { text: "START:", type: "text-delta", id: "1" },
      { text: " actual content", type: "text-delta", id: "1" },
      { type: "text-end", id: "1" },
    ]).pipeThrough(
      trimBeforeMarker("START:")({ tools: {}, stopStream: () => {} }),
    );

    await consumeStream(stream);

    expect(events).toMatchInlineSnapshot(`
      [
        {
          "id": "1",
          "type": "text-start",
        },
        {
          "id": "1",
          "text": "START:",
          "type": "text-delta",
        },
        {
          "id": "1",
          "text": " actual content",
          "type": "text-delta",
        },
        {
          "id": "1",
          "type": "text-end",
        },
      ]
    `);
  });
});
