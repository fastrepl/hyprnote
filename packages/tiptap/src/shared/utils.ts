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

function wrapInlineNodesInParagraphs(json: JSONContent): JSONContent {
  if (json.type !== "doc" || !json.content) {
    return json;
  }

  const wrappedContent: JSONContent[] = [];

  for (const node of json.content) {
    const isInlineNode = node.type === "image" || node.type === "text";

    if (isInlineNode) {
      wrappedContent.push({
        type: "paragraph",
        content: [node],
      });
    } else {
      wrappedContent.push(node);
    }
  }

  return {
    ...json,
    content: wrappedContent,
  };
}

export function md2json(markdown: string): JSONContent {
  try {
    const manager = new MarkdownManager({ extensions: getExtensions() });
    const parsed = manager.parse(markdown);
    return wrapInlineNodesInParagraphs(parsed);
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
