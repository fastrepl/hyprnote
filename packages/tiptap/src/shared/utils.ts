import { MarkdownManager } from "@tiptap/markdown";
import type { JSONContent } from "@tiptap/react";

import { getExtensions } from "./extensions";

export const EMPTY_TIPTAP_DOC: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

export function isValidTiptapContent(content: unknown): content is JSONContent {
  if (!content || typeof content !== "object") {
    return false;
  }

  const obj = content as Record<string, unknown>;
  return obj.type === "doc" && Array.isArray(obj.content);
}

export function json2md(jsonContent: JSONContent): string {
  const manager = new MarkdownManager({ extensions: getExtensions() });
  return manager.serialize(jsonContent);
}

export function md2json(markdown: string): JSONContent {
  try {
    const manager = new MarkdownManager({ extensions: getExtensions() });
    return manager.parse(markdown);
  } catch (error) {
    console.error(error);

    return {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: markdown }],
        },
      ],
    };
  }
}
