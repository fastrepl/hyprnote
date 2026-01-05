import type { MergeableStore, OptionalSchemas } from "tinybase/with-schemas";

import type { PromptStorage } from "@hypr/store";

import { createEntityPersister } from "../utils";
import { frontmatterToPrompt, promptToFrontmatter } from "./transform";

export function createPromptPersister<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
) {
  return createEntityPersister<Schemas, PromptStorage>(store, {
    tableName: "prompts",
    dirName: "prompts",
    label: "PromptPersister",
    jsonFilename: "prompts.json",
    toFrontmatter: promptToFrontmatter,
    fromFrontmatter: frontmatterToPrompt,
  });
}
