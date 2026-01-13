import { createFileRoute } from "@tanstack/react-router";
import type { Element, Root, Text } from "hast";
import rehypeParse from "rehype-parse";
import rehypeRemark from "rehype-remark";
import remarkGfm from "remark-gfm";
import remarkStringify from "remark-stringify";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import { visitParents } from "unist-util-visit-parents";

import { fetchAdminUser } from "@/functions/admin";

interface ImportRequest {
  url: string;
  title?: string;
  author?: string;
  description?: string;
  coverImage?: string;
  slug?: string;
}

interface ImportResponse {
  success: boolean;
  mdx?: string;
  frontmatter?: Record<string, string | boolean>;
  error?: string;
}

interface ParsedGoogleDocsUrl {
  docId: string;
  tabParam: string | null;
}

function parseGoogleDocsUrl(url: string): ParsedGoogleDocsUrl | null {
  const docIdPatterns = [
    /docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/,
    /docs\.google\.com\/document\/u\/\d+\/d\/([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
  ];

  let docId: string | null = null;
  for (const pattern of docIdPatterns) {
    const match = url.match(pattern);
    if (match) {
      docId = match[1];
      break;
    }
  }

  if (!docId) {
    return null;
  }

  let tabParam: string | null = null;
  try {
    const urlObj = new URL(url);
    const tabValue = urlObj.searchParams.get("tab");
    if (tabValue) {
      tabParam = tabValue;
    }
  } catch {
    const tabMatch = url.match(/[?&]tab=([^&#]+)/);
    if (tabMatch) {
      tabParam = tabMatch[1];
    }
  }

  return { docId, tabParam };
}

function parseCssPropertyList(text: string): Record<string, string> {
  const properties: Record<string, string> = {};
  const parts = text.split(";");
  for (const part of parts) {
    const match = part.match(/^\s*([^:]+):\s*(.+?)\s*$/);
    if (match) {
      properties[match[1].toLowerCase()] = match[2];
    }
  }
  return properties;
}

function resolveNodeStyle(
  node: Element,
  ancestors: Element[],
): Record<string, string> {
  const allStyles: Record<string, string>[] = [];
  const ancestorChain = [...ancestors, node];

  for (const ancestor of ancestorChain) {
    if (
      ancestor.type === "element" &&
      ancestor.properties?.style &&
      typeof ancestor.properties.style === "string"
    ) {
      allStyles.push(parseCssPropertyList(ancestor.properties.style));
    }
  }

  return Object.assign({}, ...allStyles);
}

function isElement(node: unknown): node is Element {
  return (
    typeof node === "object" &&
    node !== null &&
    "type" in node &&
    node.type === "element"
  );
}

function isText(node: unknown): node is Text {
  return (
    typeof node === "object" &&
    node !== null &&
    "type" in node &&
    node.type === "text"
  );
}

function isList(node: unknown): node is Element {
  return isElement(node) && (node.tagName === "ul" || node.tagName === "ol");
}

function isBlock(node: Element): boolean {
  const blockTags = [
    "div",
    "p",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "blockquote",
    "pre",
    "ul",
    "ol",
    "li",
    "table",
    "tr",
    "td",
    "th",
  ];
  return blockTags.includes(node.tagName);
}

function isSpaceSensitive(node: Element): boolean {
  return ["em", "strong", "ins", "del", "code"].includes(node.tagName);
}

function containsReplacedElement(node: Element): boolean {
  if (node.tagName === "img") return true;
  if (node.children) {
    for (const child of node.children) {
      if (isElement(child) && containsReplacedElement(child)) {
        return true;
      }
    }
  }
  return false;
}

function wrapChildren(node: Element, wrapper: Element): void {
  wrapper.children = node.children;
  node.children = [wrapper];
}

function convertInlineStylesToElements() {
  return (tree: Root) => {
    visitParents(
      tree,
      (node): node is Element => {
        if (!isElement(node)) return false;
        if (isBlock(node)) return false;
        return node.properties?.style !== undefined;
      },
      (node, ancestors) => {
        const style = resolveNodeStyle(
          node,
          ancestors.filter((a) => isElement(a)) as Element[],
        );

        if (style["font-style"] === "italic") {
          wrapChildren(node, {
            type: "element",
            tagName: "em",
            properties: {},
            children: [],
          });
        }

        const weight = style["font-weight"];
        if (weight === "bold" || weight === "700" || parseInt(weight) >= 700) {
          wrapChildren(node, {
            type: "element",
            tagName: "strong",
            properties: {},
            children: [],
          });
        }

        const verticalAlign = style["vertical-align"];
        if (verticalAlign === "super") {
          wrapChildren(node, {
            type: "element",
            tagName: "sup",
            properties: {},
            children: [],
          });
        } else if (verticalAlign === "sub") {
          wrapChildren(node, {
            type: "element",
            tagName: "sub",
            properties: {},
            children: [],
          });
        }

        const decorationLine =
          style["text-decoration"] || style["text-decoration-line"];
        if (decorationLine?.startsWith("line-through")) {
          wrapChildren(node, {
            type: "element",
            tagName: "del",
            properties: {},
            children: [],
          });
        }

        const fontFamily = style["font-family"];
        if (
          fontFamily &&
          /,\s*monospace/.test(fontFamily) &&
          !containsReplacedElement(node)
        ) {
          wrapChildren(node, {
            type: "element",
            tagName: "code",
            properties: {},
            children: [],
          });
        }
      },
    );
  };
}

function fixNestedLists() {
  return (tree: Root) => {
    visit(tree, isList, (node, index, parent): number | void => {
      if (parent && index !== null && index !== undefined && isList(parent)) {
        const previous = parent.children[index - 1];
        if (previous && isElement(previous) && previous.tagName === "li") {
          previous.children.push(node);
          parent.children.splice(index, 1);
          return index;
        }
      }
    });
  };
}

function isAllTextCode(node: Element): boolean | null {
  if (!node.children?.length) return null;

  let hasText = false;
  for (const child of node.children) {
    if (isElement(child)) {
      if (containsReplacedElement(child)) return false;

      if (child.tagName === "code") {
        hasText = true;
        continue;
      } else {
        const childResult = isAllTextCode(child);
        if (childResult === false) return false;
        else if (childResult === true) hasText = true;
      }
    } else if (isText(child)) {
      if (child.value.trim().length > 0) {
        return false;
      }
    }
  }
  return hasText ? true : null;
}

function createCodeBlocks() {
  return (tree: Root) => {
    if (!tree.children) return;

    const codeBlocks: Array<{ start: number; end: number }> = [];
    let activeCodeBlock: { start: number; end: number } | null = null;

    for (let i = 0; i < tree.children.length; i++) {
      const child = tree.children[i];
      if (!isElement(child)) continue;
      if (child.tagName === "code" || child.tagName === "pre") continue;

      if (isBlock(child)) {
        if (isAllTextCode(child) && !containsReplacedElement(child)) {
          if (!activeCodeBlock) {
            activeCodeBlock = { start: i, end: i + 1 };
            codeBlocks.push(activeCodeBlock);
          } else {
            activeCodeBlock.end = i + 1;
          }
        } else {
          activeCodeBlock = null;
        }
      }
    }

    for (const block of codeBlocks.reverse()) {
      const codeLines = tree.children.slice(block.start, block.end);
      const codeContent = codeLines
        .map((node: unknown) => {
          if (!isElement(node)) return "";
          return extractTextContent(node);
        })
        .join("\n");

      const preNode: Element = {
        type: "element",
        tagName: "pre",
        properties: {},
        children: [
          {
            type: "element",
            tagName: "code",
            properties: {},
            children: [{ type: "text", value: codeContent }],
          },
        ],
      };

      tree.children.splice(block.start, block.end - block.start, preNode);
    }
  };
}

function extractTextContent(node: Element): string {
  let text = "";
  if (node.children) {
    for (const child of node.children) {
      if (isText(child)) {
        text += child.value;
      } else if (isElement(child)) {
        if (child.tagName === "code") {
          text += extractTextContent(child);
        } else {
          text += extractTextContent(child);
        }
      }
    }
  }
  return text;
}

function detectTableColumnAlignment() {
  return (tree: Root) => {
    visit(
      tree,
      (node): node is Element => {
        if (!isElement(node)) return false;
        return node.tagName === "table";
      },
      (tableNode) => {
        visit(
          tableNode,
          (node): node is Element => {
            if (!isElement(node)) return false;
            return node.tagName === "td" || node.tagName === "th";
          },
          (node) => {
            if (!node.properties) {
              node.properties = {};
            }

            if (!node.properties.align) {
              let alignment: string | null = null;

              const style = node.properties.style
                ? parseCssPropertyList(node.properties.style as string)
                : {};
              const textAlign = style["text-align"];
              if (textAlign && /^(left|center|right)/.test(textAlign)) {
                alignment = textAlign.match(/^(left|center|right)/)![1];
              }

              if (!alignment && node.children) {
                for (let i = 0; i < node.children.length; i++) {
                  const child = node.children[i];
                  if (!isElement(child)) continue;

                  const childStyle = child.properties?.style
                    ? parseCssPropertyList(child.properties.style as string)
                    : {};
                  const childAlign = childStyle["text-align"];
                  const childAlignMatch =
                    childAlign?.match(/^(left|center|right)/);

                  if (i === 0) {
                    alignment = childAlignMatch?.[1] || null;
                  } else if (
                    childAlignMatch?.[1] !== alignment ||
                    !childAlignMatch
                  ) {
                    alignment = null;
                    break;
                  }
                }
              }

              if (alignment) {
                node.properties.align = alignment;
              }
            }
          },
        );
      },
    );
  };
}

function moveSpaceOutsideSensitiveChildren() {
  return (tree: Root) => {
    const spaceAtStartPattern = /^(\s+)/;
    const spaceAtEndPattern = /(\s+)$/;

    function extractInvalidSpace(node: Element, side: "start" | "end"): string {
      let totalSpace = "";

      const children =
        side === "start" ? node.children : [...node.children].reverse();

      for (let i = 0; i < children.length; i++) {
        const child = children[i];

        if (isText(child)) {
          const pattern =
            side === "start" ? spaceAtStartPattern : spaceAtEndPattern;
          const spaceMatch = child.value.match(pattern);

          if (spaceMatch) {
            const space = spaceMatch[1];
            const body =
              side === "start"
                ? child.value.slice(space.length)
                : child.value.slice(0, -space.length);

            totalSpace =
              side === "start" ? totalSpace + space : space + totalSpace;

            if (body.length) {
              child.value = body;
              break;
            } else {
              const actualIndex =
                side === "start" ? i : node.children.length - 1 - i;
              node.children.splice(actualIndex, 1);
              i--;
            }
          } else {
            break;
          }
        } else if (isElement(child) && isSpaceSensitive(child)) {
          const nestedSpace = extractInvalidSpace(child, side);
          totalSpace =
            side === "start"
              ? totalSpace + nestedSpace
              : nestedSpace + totalSpace;
        } else {
          break;
        }
      }

      return totalSpace;
    }

    visit(
      tree,
      (node): node is Element => isElement(node) && isSpaceSensitive(node),
      (node, index, parent) => {
        if (!parent || index === null || index === undefined) {
          return;
        }

        const startSpace = extractInvalidSpace(node, "start");
        if (startSpace) {
          parent.children.splice(index, 0, {
            type: "text",
            value: startSpace,
          });
          return index + 2;
        }

        const endSpace = extractInvalidSpace(node, "end");
        if (endSpace) {
          parent.children.splice(index + 1, 0, {
            type: "text",
            value: endSpace,
          });
          return index + 2;
        }
      },
    );
  };
}

function removeUnnecessaryElements() {
  return (tree: Root) => {
    visit(tree, isElement, (node, index, parent) => {
      if (!parent || index === null || index === undefined) return;

      if (node.tagName === "span" && !node.properties?.className) {
        parent.children.splice(index, 1, ...node.children);
        return index;
      }
    });
  };
}

function htmlToMarkdown(html: string): string {
  const processor = unified()
    .use(rehypeParse, { fragment: true })
    .use(convertInlineStylesToElements)
    .use(removeUnnecessaryElements)
    .use(createCodeBlocks)
    .use(fixNestedLists)
    .use(detectTableColumnAlignment)
    .use(moveSpaceOutsideSensitiveChildren)
    .use(rehypeRemark)
    .use(remarkGfm)
    .use(remarkStringify, {
      bullet: "-",
      fence: "`",
      fences: true,
      incrementListMarker: false,
    });

  const result = processor.processSync(html);
  return String(result);
}

function extractTitle(html: string): string | null {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch) {
    let title = titleMatch[1].trim();
    title = title.replace(/ - Google Docs$/, "");
    return title;
  }
  return null;
}

function removeTabTitleFromContent(html: string): string {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (!bodyMatch) {
    return html;
  }

  let bodyContent = bodyMatch[1];

  const tabTitlePattern =
    /<p[^>]+class="[^"]*title[^"]*"[^>]*><span[^>]*>[^<]+<\/span><\/p>/gi;
  bodyContent = bodyContent.replace(tabTitlePattern, "");

  return html.replace(bodyMatch[1], bodyContent);
}

function generateMdx(
  content: string,
  options: {
    title: string;
    author: string;
    description: string;
    coverImage: string;
  },
): string {
  const today = new Date().toISOString().split("T")[0];

  const frontmatter = `---
meta_title: "${options.title}"
display_title: "${options.title}"
meta_description: "${options.description}"
author: "${options.author}"
coverImage: "${options.coverImage}"
featured: false
published: false
date: "${today}"
---`;

  return `${frontmatter}\n\n${content}`;
}

export const Route = createFileRoute("/api/admin/import/google-docs")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const isDev = process.env.NODE_ENV === "development";
        if (!isDev) {
          const user = await fetchAdminUser();
          if (!user?.isAdmin) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
              status: 401,
              headers: { "Content-Type": "application/json" },
            });
          }
        }

        try {
          const body: ImportRequest = await request.json();
          const { url, title, author, description, coverImage } = body;

          if (!url) {
            return new Response(
              JSON.stringify({ success: false, error: "URL is required" }),
              { status: 400, headers: { "Content-Type": "application/json" } },
            );
          }

          const parsedUrl = parseGoogleDocsUrl(url);
          if (!parsedUrl) {
            return new Response(
              JSON.stringify({
                success: false,
                error: "Invalid Google Docs URL",
              }),
              { status: 400, headers: { "Content-Type": "application/json" } },
            );
          }

          const { docId, tabParam } = parsedUrl;
          const tabQueryParam = tabParam || "t.0";

          let html: string;
          let response: Response;

          const publishedUrl = `https://docs.google.com/document/d/${docId}/pub?tab=${tabQueryParam}`;
          response = await fetch(publishedUrl);

          if (!response.ok) {
            const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=html&tab=${tabQueryParam}`;
            response = await fetch(exportUrl);

            if (!response.ok) {
              return new Response(
                JSON.stringify({
                  success: false,
                  error:
                    "Failed to fetch document. Make sure it is either published to the web (File > Share > Publish to web) or shared with 'Anyone with the link can view' permissions.",
                }),
                {
                  status: 400,
                  headers: { "Content-Type": "application/json" },
                },
              );
            }
          }

          html = await response.text();

          html = removeTabTitleFromContent(html);
          const extractedTitle = extractTitle(html) || "Untitled";
          const finalTitle = title || extractedTitle;

          const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
          const bodyContent = bodyMatch ? bodyMatch[1] : html;

          const markdown = htmlToMarkdown(bodyContent);

          const today = new Date().toISOString().split("T")[0];
          const finalAuthor = author || "Unknown";
          const finalDescription = description || "";

          const mdx = generateMdx(markdown, {
            title: finalTitle,
            author: finalAuthor,
            description: finalDescription,
            coverImage: coverImage || "",
          });

          const frontmatter = {
            meta_title: finalTitle,
            display_title: finalTitle,
            meta_description: finalDescription,
            author: finalAuthor,
            coverImage: coverImage || "",
            featured: false,
            published: false,
            date: today,
          };

          const result: ImportResponse = {
            success: true,
            mdx,
            frontmatter,
          };

          return new Response(JSON.stringify(result), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          return new Response(
            JSON.stringify({
              success: false,
              error: (err as Error).message,
            }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
