import { describe, expect, it } from "vitest";

import { extractContextRefsFromTiptapJson } from "./hooks";

function docWithMention(type: string, id: string) {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          { type: "text", text: "find action items in " },
          {
            type: "mention-@",
            attrs: { id, type, label: id },
          },
        ],
      },
    ],
  } as never;
}

describe("extractContextRefsFromTiptapJson", () => {
  it("turns a folder mention into a removable manual folder ref", () => {
    expect(
      extractContextRefsFromTiptapJson(docWithMention("folder", "CS 101")),
    ).toEqual([
      {
        kind: "folder",
        key: "folder:manual:CS 101",
        source: "manual",
        folderId: "CS 101",
      },
    ]);
  });

  it("deduplicates repeated folder mentions", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "mention-@",
              attrs: { id: "CS 101", type: "folder", label: "CS 101" },
            },
            {
              type: "mention-@",
              attrs: { id: "CS 101", type: "folder", label: "CS 101" },
            },
          ],
        },
      ],
    } as never;

    expect(extractContextRefsFromTiptapJson(doc)).toHaveLength(1);
  });
});
