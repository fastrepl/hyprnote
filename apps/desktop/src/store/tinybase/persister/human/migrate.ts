import type { HumanStorage } from "@hypr/store";

import { migrateJsonToMarkdown } from "../markdown-utils";
import { humanToFrontmatter } from "./utils";

const LABEL = "HumanPersister";
const DIR_NAME = "humans";
const JSON_FILENAME = "humans.json";

export async function migrateHumansJsonIfNeeded(
  dataDir: string,
): Promise<void> {
  return migrateJsonToMarkdown<HumanStorage>(
    dataDir,
    JSON_FILENAME,
    DIR_NAME,
    LABEL,
    (_id, human) => humanToFrontmatter(human),
  );
}
