import { readDir, readTextFile, remove } from "@tauri-apps/plugin-fs";

import type { HumanStorage } from "@hypr/store";

import { isFileNotFoundError, isUUID } from "../utils";
import {
  getHumanDir,
  getHumanFilePath,
  parseMarkdownWithFrontmatter,
} from "./utils";

export async function loadAllHumans(
  dataDir: string,
): Promise<Record<string, HumanStorage>> {
  const result: Record<string, HumanStorage> = {};
  const humansDir = getHumanDir(dataDir);

  let entries: { name: string; isDirectory: boolean }[];
  try {
    entries = await readDir(humansDir);
  } catch (error) {
    if (isFileNotFoundError(error)) {
      return result;
    }
    throw error;
  }

  for (const entry of entries) {
    if (entry.isDirectory) continue;
    if (!entry.name.endsWith(".md")) continue;

    const humanId = entry.name.replace(/\.md$/, "");
    if (!isUUID(humanId)) {
      console.warn(`[HumanPersister] Skipping non-UUID file: ${entry.name}`);
      continue;
    }

    try {
      const filePath = getHumanFilePath(dataDir, humanId);
      const content = await readTextFile(filePath);
      const { frontmatter, body } = parseMarkdownWithFrontmatter(content);

      result[humanId] = {
        user_id: String(frontmatter.user_id ?? ""),
        created_at: String(frontmatter.created_at ?? ""),
        name: String(frontmatter.name ?? ""),
        email: String(frontmatter.email ?? ""),
        org_id: String(frontmatter.org_id ?? ""),
        job_title: String(frontmatter.job_title ?? ""),
        linkedin_username: String(frontmatter.linkedin_username ?? ""),
        memo: body,
      };
    } catch (error) {
      console.error(`[HumanPersister] Failed to load human ${humanId}:`, error);
      continue;
    }
  }

  return result;
}

export async function cleanupOrphanHumanFiles(
  dataDir: string,
  validHumanIds: Set<string>,
): Promise<void> {
  const humansDir = getHumanDir(dataDir);

  let entries: { name: string; isDirectory: boolean }[];
  try {
    entries = await readDir(humansDir);
  } catch (error) {
    if (isFileNotFoundError(error)) {
      return;
    }
    throw error;
  }

  for (const entry of entries) {
    if (entry.isDirectory) continue;
    if (!entry.name.endsWith(".md")) continue;

    const humanId = entry.name.replace(/\.md$/, "");
    if (!isUUID(humanId)) continue;

    if (!validHumanIds.has(humanId)) {
      try {
        const filePath = getHumanFilePath(dataDir, humanId);
        await remove(filePath);
      } catch (error) {
        if (!isFileNotFoundError(error)) {
          console.error(
            `[HumanPersister] Failed to remove orphan file ${entry.name}:`,
            error,
          );
        }
      }
    }
  }
}
