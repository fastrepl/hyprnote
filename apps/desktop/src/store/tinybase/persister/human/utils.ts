import { sep } from "@tauri-apps/api/path";

import { commands } from "@hypr/plugin-export";

export interface ParsedMarkdown {
  frontmatter: Record<string, unknown>;
  body: string;
}

export async function parseMarkdownWithFrontmatter(
  content: string,
): Promise<ParsedMarkdown> {
  const result = await commands.parseFrontmatter(content);
  if (result.status === "error") {
    console.error(
      "[HumanPersister] Failed to parse frontmatter:",
      result.error,
    );
    return { frontmatter: {}, body: content };
  }
  return {
    frontmatter: result.data.frontmatter as Record<string, unknown>,
    body: result.data.content.trim(),
  };
}

export function getHumanDir(dataDir: string): string {
  return [dataDir, "humans"].join(sep());
}

export function getHumanFilePath(dataDir: string, humanId: string): string {
  return [dataDir, "humans", `${humanId}.md`].join(sep());
}
