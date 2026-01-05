import type { MergeableStore, OptionalSchemas } from "tinybase/with-schemas";

import type { HumanStorage } from "@hypr/store";

import { createEntityPersister } from "../utils";
import { frontmatterToHuman, humanToFrontmatter } from "./transform";

export function createHumanPersister<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
) {
  return createEntityPersister<Schemas, HumanStorage>(store, {
    tableName: "humans",
    dirName: "humans",
    label: "HumanPersister",
    jsonFilename: "humans.json",
    toFrontmatter: humanToFrontmatter,
    fromFrontmatter: frontmatterToHuman,
  });
}
