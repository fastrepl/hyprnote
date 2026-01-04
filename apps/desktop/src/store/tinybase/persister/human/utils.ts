import { sep } from "@tauri-apps/api/path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

export interface ParsedMarkdown {
  frontmatter: Record<string, unknown>;
  body: string;
}

export function parseMarkdownWithFrontmatter(content: string): ParsedMarkdown {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const [, yamlContent, body] = match;

  let frontmatter: Record<string, unknown> = {};
  try {
    frontmatter = parseYaml(yamlContent) ?? {};
  } catch {
    frontmatter = {};
  }

  return { frontmatter, body: body.trim() };
}

export function serializeMarkdownWithFrontmatter(
  frontmatter: Record<string, unknown>,
  body: string,
): string {
  const yamlContent = stringifyYaml(frontmatter, { lineWidth: 0 }).trim();
  return `---\n${yamlContent}\n---\n\n${body}`;
}

export function getHumanDir(dataDir: string): string {
  return [dataDir, "humans"].join(sep());
}

export function getHumanFilePath(dataDir: string, humanId: string): string {
  return [dataDir, "humans", `${humanId}.md`].join(sep());
}
