import type { JsonValue } from "@hypr/plugin-fs-sync";
import type { HumanStorage } from "@hypr/store";

import {
  createEntityPaths,
  type ParsedMarkdown,
  parseMarkdownWithFrontmatter as parseMarkdownWithFrontmatterBase,
} from "../markdown-utils";

export type { ParsedMarkdown };

const LABEL = "HumanPersister";
const DIR_NAME = "humans";

export const { getDir: getHumanDir, getFilePath: getHumanFilePath } =
  createEntityPaths(DIR_NAME);

export function parseMarkdownWithFrontmatter(
  content: string,
): Promise<ParsedMarkdown> {
  return parseMarkdownWithFrontmatterBase(content, LABEL);
}

export function frontmatterToHuman(
  frontmatter: Record<string, unknown>,
  body: string,
): HumanStorage {
  return {
    user_id: String(frontmatter.user_id ?? ""),
    created_at: String(frontmatter.created_at ?? ""),
    name: String(frontmatter.name ?? ""),
    email: String(frontmatter.email ?? ""),
    org_id: String(frontmatter.org_id ?? ""),
    job_title: String(frontmatter.job_title ?? ""),
    linkedin_username: String(frontmatter.linkedin_username ?? ""),
    memo: body,
  };
}

export function humanToFrontmatter(human: HumanStorage): {
  frontmatter: Record<string, JsonValue>;
  body: string;
} {
  const { memo, ...frontmatterFields } = human;
  return {
    frontmatter: {
      user_id: frontmatterFields.user_id ?? "",
      created_at: frontmatterFields.created_at ?? "",
      name: frontmatterFields.name ?? "",
      email: frontmatterFields.email ?? "",
      org_id: frontmatterFields.org_id ?? "",
      job_title: frontmatterFields.job_title ?? "",
      linkedin_username: frontmatterFields.linkedin_username ?? "",
    },
    body: memo ?? "",
  };
}
