import type { PromptStorage } from "@hypr/store";
import type { Schemas } from "@hypr/store";

import type { Store } from "../../store/main";
import { createMarkdownDirPersister } from "../factories";
import { frontmatterToPrompt, promptToFrontmatter } from "./transform";

export function createPromptPersister(store: Store) {
  return createMarkdownDirPersister<Schemas, PromptStorage>(store, {
    tableName: "prompts",
    dirName: "prompts",
    label: "PromptPersister",
    toFrontmatter: promptToFrontmatter,
    fromFrontmatter: frontmatterToPrompt,
  });
}
