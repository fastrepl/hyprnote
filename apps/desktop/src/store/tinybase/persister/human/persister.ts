import type { MergeableStore, OptionalSchemas } from "tinybase/with-schemas";

import type { HumanStorage } from "@hypr/store";

import { createMarkdownDirPersister } from "../utils";
import { frontmatterToHuman, humanToFrontmatter } from "./transform";

export function createHumanPersister<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
) {
  return createMarkdownDirPersister<Schemas, HumanStorage>(store, {
    tableName: "humans",
    dirName: "humans",
    label: "HumanPersister",
    legacyJsonPath: "humans.json",
    toFrontmatter: humanToFrontmatter,
    fromFrontmatter: frontmatterToHuman,
  });
}
