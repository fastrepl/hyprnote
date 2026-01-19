import type {
  DividerBlock,
  ImageBlock,
  KnownBlock,
  RichTextBlock,
  RichTextElement,
  RichTextSection,
} from "@slack/types";
import { lexer, type Token, type Tokens } from "marked";

const TABLE_MAX_ROWS = 100;
const TABLE_MAX_COLS = 20;

type Style = NonNullable<RichTextElement["style"]>;

function textEl(value: string, style?: Style): RichTextElement {
  return style
    ? { type: "text", text: value, style }
    : { type: "text", text: value };
}

function parseTextWithEmojis(value: string, style?: Style): RichTextElement[] {
  const elements: RichTextElement[] = [];
  const regex = /:([a-zA-Z0-9_+-]+):/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(value)) !== null) {
    if (match[1].length === 0) continue;
    if (match.index > lastIndex) {
      elements.push(textEl(value.slice(lastIndex, match.index), style));
    }
    elements.push({ type: "emoji", name: match[1] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < value.length) {
    elements.push(textEl(value.slice(lastIndex), style));
  }

  return elements.length > 0
    ? elements
    : value.length > 0
      ? [textEl(value, style)]
      : [];
}

function inlineTokensToElements(
  tokens: Token[],
  style?: Style,
): RichTextElement[] {
  const elements: RichTextElement[] = [];

  for (const token of tokens) {
    switch (token.type) {
      case "text":
        elements.push(
          ...parseTextWithEmojis((token as Tokens.Text).text, style),
        );
        break;
      case "strong":
        elements.push(
          ...inlineTokensToElements((token as Tokens.Strong).tokens, {
            ...style,
            bold: true,
          }),
        );
        break;
      case "em":
        elements.push(
          ...inlineTokensToElements((token as Tokens.Em).tokens, {
            ...style,
            italic: true,
          }),
        );
        break;
      case "del":
        elements.push(
          ...inlineTokensToElements((token as Tokens.Del).tokens, {
            ...style,
            strike: true,
          }),
        );
        break;
      case "codespan":
        elements.push(
          textEl((token as Tokens.Codespan).text, { ...style, code: true }),
        );
        break;
      case "link": {
        const t = token as Tokens.Link;
        elements.push({ type: "link", url: t.href, text: t.text });
        break;
      }
      case "escape":
        elements.push(textEl((token as Tokens.Escape).text, style));
        break;
      case "br":
        elements.push({ type: "text", text: "\n" });
        break;
      default:
        if ("text" in token && typeof token.text === "string") {
          elements.push(textEl(token.text, style));
        }
    }
  }

  return elements;
}

function toSection(tokens: Token[]): RichTextSection {
  const elements = inlineTokensToElements(tokens);
  return {
    type: "rich_text_section",
    elements: elements.length > 0 ? elements : [{ type: "text", text: "" }],
  };
}

function listItemToSection(item: Tokens.ListItem): RichTextSection {
  const firstToken = item.tokens?.[0] as
    | (Token & { tokens?: Token[] })
    | undefined;
  const inlineTokens = firstToken?.tokens ?? (firstToken ? [firstToken] : []);
  return inlineTokens.length > 0
    ? toSection(inlineTokens)
    : {
        type: "rich_text_section",
        elements: [{ type: "text", text: item.text }],
      };
}

// Slack only supports ONE native table block per message.
function tableToNativeBlock(t: Tokens.Table): KnownBlock | null {
  const headerRow = t.header
    .slice(0, TABLE_MAX_COLS)
    .map((c) => ({ type: "raw_text" as const, text: c.text || " " }));

  if (headerRow.length === 0) return null;

  const dataRows = t.rows
    .slice(0, TABLE_MAX_ROWS - 1)
    .map((row) =>
      row
        .slice(0, TABLE_MAX_COLS)
        .map((c) => ({ type: "raw_text" as const, text: c.text || " " })),
    )
    .filter((row) => row.length > 0);

  const rows = [headerRow, ...dataRows];
  return { type: "table", rows } as KnownBlock;
}

// Fallback for additional tables: render as preformatted text.
function tableToPreformatted(t: Tokens.Table): RichTextBlock {
  const header = t.header.map((c) => c.text);
  const separator = header.map((h) => "-".repeat(h.length));
  const rows = t.rows.map((row) => row.map((c) => c.text).join(" | "));
  const content = [header.join(" | "), separator.join(" | "), ...rows].join(
    "\n",
  );

  return {
    type: "rich_text",
    elements: [
      {
        type: "rich_text_preformatted",
        elements: [{ type: "text", text: content }],
      },
    ],
  };
}

function tokenToBlocks(token: Token): KnownBlock[] {
  switch (token.type) {
    case "heading":
    case "paragraph": {
      const t = token as Tokens.Paragraph | Tokens.Heading;
      if (!t.tokens?.length) return [];

      // If the paragraph contains only an image, convert it to an ImageBlock
      if (
        t.tokens.length === 1 &&
        t.tokens[0].type === "image"
      ) {
        const img = t.tokens[0] as Tokens.Image;
        return [
          {
            type: "image",
            image_url: img.href,
            alt_text: img.text || "image",
          } as ImageBlock,
        ];
      }

      return [
        { type: "rich_text", elements: [toSection(t.tokens)] } as RichTextBlock,
      ];
    }

    case "list": {
      const t = token as Tokens.List;
      const sections = t.items.map(listItemToSection);
      if (sections.length === 0) return [];
      return [
        {
          type: "rich_text",
          elements: [
            {
              type: "rich_text_list",
              style: t.ordered ? "ordered" : "bullet",
              elements: sections,
            },
          ],
        } as RichTextBlock,
      ];
    }

    case "code": {
      const t = token as Tokens.Code;
      return [
        {
          type: "rich_text",
          elements: [
            {
              type: "rich_text_preformatted",
              elements: [{ type: "text", text: t.text }],
            },
          ],
        } as RichTextBlock,
      ];
    }

    case "blockquote": {
      const t = token as Tokens.Blockquote;
      const quoteElements: RichTextElement[] = [];
      for (const inner of t.tokens) {
        if (inner.type === "paragraph") {
          const para = inner as Tokens.Paragraph;
          if (para.tokens)
            quoteElements.push(...inlineTokensToElements(para.tokens));
        }
      }
      if (quoteElements.length === 0) return [];
      return [
        {
          type: "rich_text",
          elements: [{ type: "rich_text_quote", elements: quoteElements }],
        } as RichTextBlock,
      ];
    }

    case "hr":
      return [{ type: "divider" } as DividerBlock];

    case "image": {
      const t = token as Tokens.Image;
      return [
        {
          type: "image",
          image_url: t.href,
          alt_text: t.text || "image",
        } as ImageBlock,
      ];
    }

    default:
      return [];
  }
}

export function markdownToBlocks(markdown: string): KnownBlock[] {
  const tokens = lexer(markdown);
  const blocks: KnownBlock[] = [];
  let nativeTableBlock: KnownBlock | null = null;

  for (const token of tokens) {
    if (token.type === "space") continue;

    if (token.type === "table") {
      const t = token as Tokens.Table;
      // Slack only supports one native table per message; subsequent tables become preformatted.
      if (!nativeTableBlock) {
        const table = tableToNativeBlock(t);
        if (table) {
          nativeTableBlock = table;
        } else {
          blocks.push(tableToPreformatted(t));
        }
      } else {
        blocks.push(tableToPreformatted(t));
      }
    } else {
      blocks.push(...tokenToBlocks(token));
    }
  }

  if (nativeTableBlock) blocks.unshift(nativeTableBlock);

  if (blocks.length === 0) {
    return [
      {
        type: "rich_text",
        elements: [
          {
            type: "rich_text_section",
            elements: [
              { type: "text", text: markdown || "No response generated." },
            ],
          },
        ],
      } as RichTextBlock,
    ];
  }

  return blocks;
}
