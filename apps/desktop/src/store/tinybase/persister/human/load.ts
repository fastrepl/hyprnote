import type { HumanStorage } from "@hypr/store";

import { loadAllEntities } from "../markdown-utils";
import { frontmatterToHuman } from "./utils";

const LABEL = "HumanPersister";
const DIR_NAME = "humans";

export async function loadAllHumans(
  dataDir: string,
): Promise<Record<string, HumanStorage>> {
  return loadAllEntities(dataDir, DIR_NAME, LABEL, frontmatterToHuman);
}
