import type { JsonValue } from "@hypr/plugin-fs-sync";
import type { HumanStorage } from "@hypr/store";

import {
  createEntityPaths,
  type ParsedMarkdown,
  parseMarkdownWithFrontmatter as parseMarkdownWithFrontmatterBase,
} from "../markdown-utils";
import { frontmatterToStore, storeToFrontmatter } from "./transform";

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
    ...frontmatterToStore(frontmatter),
    memo: body,
  } as HumanStorage;
}

export function humanToFrontmatter(human: HumanStorage): {
  frontmatter: Record<string, JsonValue>;
  body: string;
} {
  const { memo, ...storeFields } = human;
  return {
    frontmatter: storeToFrontmatter(storeFields) as Record<string, JsonValue>,
    body: memo ?? "",
  };
}
