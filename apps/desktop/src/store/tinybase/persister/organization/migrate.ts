import { sep } from "@tauri-apps/api/path";
import { exists, mkdir, readTextFile, remove } from "@tauri-apps/plugin-fs";

import {
  commands as exportCommands,
  type FrontmatterInput,
  type JsonValue,
} from "@hypr/plugin-export";
import type { OrganizationStorage } from "@hypr/store";

import { isFileNotFoundError } from "../utils";
import { getOrganizationDir, getOrganizationFilePath } from "./utils";

export async function migrateOrganizationsJsonIfNeeded(
  dataDir: string,
): Promise<void> {
  const organizationsJsonPath = [dataDir, "organizations.json"].join(sep());
  const organizationsDir = getOrganizationDir(dataDir);

  const jsonExists = await exists(organizationsJsonPath);
  if (!jsonExists) {
    return;
  }

  const dirExists = await exists(organizationsDir);
  if (dirExists) {
    return;
  }

  console.log(
    "[OrganizationPersister] Migrating from organizations.json to organizations/*.md",
  );

  try {
    const content = await readTextFile(organizationsJsonPath);
    const organizations = JSON.parse(content) as Record<
      string,
      OrganizationStorage
    >;

    await mkdir(organizationsDir, { recursive: true });

    const batchItems: [FrontmatterInput, string][] = [];

    for (const [orgId, org] of Object.entries(organizations)) {
      const frontmatter: Record<string, JsonValue> = {
        created_at: org.created_at ?? "",
        name: org.name ?? "",
        user_id: org.user_id ?? "",
      };

      const body = "";
      const filePath = getOrganizationFilePath(dataDir, orgId);

      batchItems.push([{ frontmatter, content: body }, filePath]);
    }

    if (batchItems.length > 0) {
      const result = await exportCommands.exportFrontmatterBatch(batchItems);
      if (result.status === "error") {
        throw new Error(
          `Failed to export migrated organizations: ${result.error}`,
        );
      }
    }

    await remove(organizationsJsonPath);

    console.log(
      `[OrganizationPersister] Migration complete: ${Object.keys(organizations).length} organizations migrated`,
    );
  } catch (error) {
    if (!isFileNotFoundError(error)) {
      console.error("[OrganizationPersister] Migration failed:", error);
    }
  }
}
