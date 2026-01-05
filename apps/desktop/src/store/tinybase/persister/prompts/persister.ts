import type { MergeableStore, OptionalSchemas } from "tinybase/with-schemas";

import type { PromptStorage } from "@hypr/store";

import { createMarkdownDirPersister } from "../factories";
import { frontmatterToPrompt, promptToFrontmatter } from "./transform";

export function createPromptPersister<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
) {
  return createMarkdownDirPersister<Schemas, PromptStorage>(store, {
    tableName: "prompts",
    dirName: "prompts",
    label: "PromptPersister",
    legacyJsonPath: "prompts.json",
    toFrontmatter: promptToFrontmatter,
    fromFrontmatter: frontmatterToPrompt,
  });
}
