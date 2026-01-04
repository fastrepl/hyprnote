import { sep } from "@tauri-apps/api/path";
import {
  exists,
  mkdir,
  readTextFile,
  remove,
  writeTextFile,
} from "@tauri-apps/plugin-fs";

import type { HumanStorage } from "@hypr/store";

import { isFileNotFoundError } from "../utils";
import {
  getHumanDir,
  getHumanFilePath,
  serializeMarkdownWithFrontmatter,
} from "./utils";

export async function migrateHumansJsonIfNeeded(
  dataDir: string,
): Promise<void> {
  const humansJsonPath = [dataDir, "humans.json"].join(sep());
  const humansDir = getHumanDir(dataDir);

  const jsonExists = await exists(humansJsonPath);
  if (!jsonExists) {
    return;
  }

  const dirExists = await exists(humansDir);
  if (dirExists) {
    return;
  }

  console.log("[HumanPersister] Migrating from humans.json to humans/*.md");

  try {
    const content = await readTextFile(humansJsonPath);
    const humans = JSON.parse(content) as Record<string, HumanStorage>;

    await mkdir(humansDir, { recursive: true });

    for (const [humanId, human] of Object.entries(humans)) {
      const { memo, ...frontmatterFields } = human;

      const frontmatter: Record<string, unknown> = {
        user_id: frontmatterFields.user_id ?? "",
        created_at: frontmatterFields.created_at ?? "",
        name: frontmatterFields.name ?? "",
        email: frontmatterFields.email ?? "",
        org_id: frontmatterFields.org_id ?? "",
        job_title: frontmatterFields.job_title ?? "",
        linkedin_username: frontmatterFields.linkedin_username ?? "",
      };

      const body = memo ?? "";
      const mdContent = serializeMarkdownWithFrontmatter(frontmatter, body);
      const filePath = getHumanFilePath(dataDir, humanId);

      await writeTextFile(filePath, mdContent);
    }

    await remove(humansJsonPath);

    console.log(
      `[HumanPersister] Migration complete: ${Object.keys(humans).length} humans migrated`,
    );
  } catch (error) {
    if (!isFileNotFoundError(error)) {
      console.error("[HumanPersister] Migration failed:", error);
    }
  }
}
