import type { JsonValue } from "@hypr/plugin-export";
import type { OrganizationStorage } from "@hypr/store";

import {
  createEntityPaths,
  type ParsedMarkdown,
  parseMarkdownWithFrontmatter as parseMarkdownWithFrontmatterBase,
} from "../markdown-utils";

export type { ParsedMarkdown };

const LABEL = "OrganizationPersister";
const DIR_NAME = "organizations";

export const {
  getDir: getOrganizationDir,
  getFilePath: getOrganizationFilePath,
} = createEntityPaths(DIR_NAME);

export function parseMarkdownWithFrontmatter(
  content: string,
): Promise<ParsedMarkdown> {
  return parseMarkdownWithFrontmatterBase(content, LABEL);
}

export function frontmatterToOrganization(
  frontmatter: Record<string, unknown>,
  _body: string,
): OrganizationStorage {
  return {
    user_id: String(frontmatter.user_id ?? ""),
    created_at: String(frontmatter.created_at ?? ""),
    name: String(frontmatter.name ?? ""),
  };
}

export function organizationToFrontmatter(org: OrganizationStorage): {
  frontmatter: Record<string, JsonValue>;
  body: string;
} {
  return {
    frontmatter: {
      created_at: org.created_at ?? "",
      name: org.name ?? "",
      user_id: org.user_id ?? "",
    },
    body: "",
  };
}
