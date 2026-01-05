import type { JsonValue } from "@hypr/plugin-fs-sync";
import type { PromptStorage } from "@hypr/store";

import {
  createEntityPaths,
  type ParsedMarkdown,
  parseMarkdownWithFrontmatter as parseMarkdownWithFrontmatterBase,
} from "../markdown-utils";

export type { ParsedMarkdown };

const LABEL = "PromptPersister";
const DIR_NAME = "prompts";

export const { getDir: getPromptDir, getFilePath: getPromptFilePath } =
  createEntityPaths(DIR_NAME);

export function parseMarkdownWithFrontmatter(
  content: string,
): Promise<ParsedMarkdown> {
  return parseMarkdownWithFrontmatterBase(content, LABEL);
}

export function frontmatterToPrompt(
  frontmatter: Record<string, unknown>,
  body: string,
): PromptStorage {
  return {
    user_id: String(frontmatter.user_id ?? ""),
    created_at: String(frontmatter.created_at ?? ""),
    task_type: String(frontmatter.task_type ?? ""),
    content: body,
  };
}

export function promptToFrontmatter(prompt: PromptStorage): {
  frontmatter: Record<string, JsonValue>;
  body: string;
} {
  const { content, ...frontmatterFields } = prompt;
  return {
    frontmatter: {
      user_id: frontmatterFields.user_id ?? "",
      created_at: frontmatterFields.created_at ?? "",
      task_type: frontmatterFields.task_type ?? "",
    },
    body: content ?? "",
  };
}
