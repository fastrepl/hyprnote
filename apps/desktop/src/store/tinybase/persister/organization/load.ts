import { readDir, readTextFile, remove } from "@tauri-apps/plugin-fs";

import type { OrganizationStorage } from "@hypr/store";

import { isFileNotFoundError, isUUID } from "../utils";
import {
  getOrganizationDir,
  getOrganizationFilePath,
  parseMarkdownWithFrontmatter,
} from "./utils";

export async function loadAllOrganizations(
  dataDir: string,
): Promise<Record<string, OrganizationStorage>> {
  const result: Record<string, OrganizationStorage> = {};
  const organizationsDir = getOrganizationDir(dataDir);

  let entries: { name: string; isDirectory: boolean }[];
  try {
    entries = await readDir(organizationsDir);
  } catch (error) {
    if (isFileNotFoundError(error)) {
      return result;
    }
    throw error;
  }

  for (const entry of entries) {
    if (entry.isDirectory) continue;
    if (!entry.name.endsWith(".md")) continue;

    const orgId = entry.name.replace(/\.md$/, "");
    if (!isUUID(orgId)) {
      console.warn(
        `[OrganizationPersister] Skipping non-UUID file: ${entry.name}`,
      );
      continue;
    }

    try {
      const filePath = getOrganizationFilePath(dataDir, orgId);
      const content = await readTextFile(filePath);
      const { frontmatter } = await parseMarkdownWithFrontmatter(content);

      result[orgId] = {
        user_id: String(frontmatter.user_id ?? ""),
        created_at: String(frontmatter.created_at ?? ""),
        name: String(frontmatter.name ?? ""),
      };
    } catch (error) {
      console.error(
        `[OrganizationPersister] Failed to load organization ${orgId}:`,
        error,
      );
      continue;
    }
  }

  return result;
}

export async function cleanupOrphanOrganizationFiles(
  dataDir: string,
  validOrgIds: Set<string>,
): Promise<void> {
  const organizationsDir = getOrganizationDir(dataDir);

  let entries: { name: string; isDirectory: boolean }[];
  try {
    entries = await readDir(organizationsDir);
  } catch (error) {
    if (isFileNotFoundError(error)) {
      return;
    }
    throw error;
  }

  for (const entry of entries) {
    if (entry.isDirectory) continue;
    if (!entry.name.endsWith(".md")) continue;

    const orgId = entry.name.replace(/\.md$/, "");
    if (!isUUID(orgId)) continue;

    if (!validOrgIds.has(orgId)) {
      try {
        const filePath = getOrganizationFilePath(dataDir, orgId);
        await remove(filePath);
      } catch (error) {
        if (!isFileNotFoundError(error)) {
          console.error(
            `[OrganizationPersister] Failed to remove orphan file ${entry.name}:`,
            error,
          );
        }
      }
    }
  }
}
