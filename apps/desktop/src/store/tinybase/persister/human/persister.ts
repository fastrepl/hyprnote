import type { HumanStorage } from "@hypr/store";
import type { Schemas } from "@hypr/store";

import type { Store } from "../../store/main";
import { createMarkdownDirPersister } from "../factories";
import { parseHumanIdFromPath } from "./changes";
import { frontmatterToHuman, humanToFrontmatter } from "./transform";

export function createHumanPersister(store: Store) {
  return createMarkdownDirPersister<Schemas, HumanStorage>(store, {
    tableName: "humans",
    dirName: "humans",
    label: "HumanPersister",
    entityParser: parseHumanIdFromPath,
    toFrontmatter: humanToFrontmatter,
    fromFrontmatter: frontmatterToHuman,
  });
}
