import {
  type JSONContent,
  generateJSON as tiptapGenerateJSON,
} from "@tiptap/react";
import { renderToMarkdown } from "@tiptap/static-renderer/pm/markdown";
import TurndownService from "turndown";

import { extensions, markdownExtensions } from "./extensions";

// Re-export types and functions for convenience
export type { JSONContent };
export { tiptapGenerateJSON as generateJSON };

/**
 * Empty Tiptap document constant
 * Use this for initializing empty documents consistently across the codebase
 */
export const EMPTY_TIPTAP_DOC: JSONContent = { type: "doc", content: [] };

/**
 * Stringified empty Tiptap document
 * Use this when storing empty documents as strings
 */
export const EMPTY_TIPTAP_DOC_STRING = JSON.stringify(EMPTY_TIPTAP_DOC);

const turndown = new TurndownService({ headingStyle: "atx" });

turndown.addRule("p", {
  filter: "p",
  replacement: function (content, node) {
    if (node.parentNode?.nodeName === "LI") {
      return content;
    }

    if (content.trim() === "") {
      return "";
    }

    return `\n\n${content}\n\n`;
  },
});

turndown.addRule("taskList", {
  filter: function (node) {
    return (
      node.nodeName === "UL" && node.getAttribute("data-type") === "taskList"
    );
  },
  replacement: function (content) {
    return content;
  },
});

turndown.addRule("taskItem", {
  filter: function (node) {
    if (node.nodeName !== "LI" || !node.parentNode) {
      return false;
    }
    const parent = node.parentNode as HTMLElement;
    return (
      parent.nodeName === "UL" &&
      parent.getAttribute("data-type") === "taskList"
    );
  },
  replacement: function (content, node) {
    const checkbox = node.querySelector(
      'input[type="checkbox"]',
    ) as HTMLInputElement;
    const isChecked = checkbox ? checkbox.checked : false;
    const checkboxSymbol = isChecked ? "[x]" : "[ ]";

    const cleanContent = content.replace(/^\s*\[[\sxX]\]\s*/, "").trim();

    return `- ${checkboxSymbol} ${cleanContent}\n`;
  },
});

export function html2md(html: string) {
  return turndown.turndown(html);
}

/**
 * Converts markdown string to Tiptap JSON
 * @param markdown - Markdown string
 * @returns Tiptap JSON content
 */
export function md2json(markdown: string): JSONContent {
  return tiptapGenerateJSON(markdown, markdownExtensions);
}

/**
 * Converts Tiptap JSON content to markdown string
 * @param jsonContent - Tiptap JSON content or stringified JSON
 * @returns Markdown string
 */
export function json2md(jsonContent: JSONContent | string): string {
  try {
    // Handle empty or null input
    if (!jsonContent) {
      return "";
    }

    const content =
      typeof jsonContent === "string" ? JSON.parse(jsonContent) : jsonContent;

    // Validate that we have a valid Tiptap document structure
    if (!content || typeof content !== "object" || content.type !== "doc") {
      console.error("Invalid Tiptap document structure:", content);
      return "";
    }

    return renderToMarkdown({
      extensions,
      content,
    });
  } catch (error) {
    console.error("Failed to convert JSON to markdown:", error, jsonContent);
    return "";
  }
}
