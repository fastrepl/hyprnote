import { sep } from "@tauri-apps/api/path";
import {
  exists,
  mkdir,
  readDir,
  readTextFile,
  remove,
} from "@tauri-apps/plugin-fs";

import {
  commands as exportCommands,
  type FrontmatterInput,
  type JsonValue,
} from "@hypr/plugin-export";

import { isFileNotFoundError, isUUID } from "./utils";

export interface ParsedMarkdown {
  frontmatter: Record<string, unknown>;
  body: string;
}

export async function parseMarkdownWithFrontmatter(
  content: string,
  label: string,
): Promise<ParsedMarkdown> {
  const result = await exportCommands.parseFrontmatter(content);
  if (result.status === "error") {
    console.error(`[${label}] Failed to parse frontmatter:`, result.error);
    return { frontmatter: {}, body: content };
  }
  return {
    frontmatter: result.data.frontmatter as Record<string, unknown>,
    body: result.data.content.trim(),
  };
}

export function createEntityPaths(dirName: string) {
  return {
    getDir: (dataDir: string): string => [dataDir, dirName].join(sep()),
    getFilePath: (dataDir: string, id: string): string =>
      [dataDir, dirName, `${id}.md`].join(sep()),
  };
}

export async function loadAllEntities<T>(
  dataDir: string,
  dirName: string,
  label: string,
  mapFrontmatter: (frontmatter: Record<string, unknown>, body: string) => T,
): Promise<Record<string, T>> {
  const result: Record<string, T> = {};
  const paths = createEntityPaths(dirName);
  const entityDir = paths.getDir(dataDir);

  let entries: { name: string; isDirectory: boolean }[];
  try {
    entries = await readDir(entityDir);
  } catch (error) {
    if (isFileNotFoundError(error)) {
      return result;
    }
    throw error;
  }

  for (const entry of entries) {
    if (entry.isDirectory) continue;
    if (!entry.name.endsWith(".md")) continue;

    const entityId = entry.name.replace(/\.md$/, "");
    if (!isUUID(entityId)) {
      console.warn(`[${label}] Skipping non-UUID file: ${entry.name}`);
      continue;
    }

    try {
      const filePath = paths.getFilePath(dataDir, entityId);
      const content = await readTextFile(filePath);
      const { frontmatter, body } = await parseMarkdownWithFrontmatter(
        content,
        label,
      );

      result[entityId] = mapFrontmatter(frontmatter, body);
    } catch (error) {
      console.error(`[${label}] Failed to load entity ${entityId}:`, error);
      continue;
    }
  }

  return result;
}

export async function cleanupOrphanFiles(
  dataDir: string,
  dirName: string,
  validIds: Set<string>,
  label: string,
): Promise<void> {
  const paths = createEntityPaths(dirName);
  const entityDir = paths.getDir(dataDir);

  let entries: { name: string; isDirectory: boolean }[];
  try {
    entries = await readDir(entityDir);
  } catch (error) {
    if (isFileNotFoundError(error)) {
      return;
    }
    throw error;
  }

  for (const entry of entries) {
    if (entry.isDirectory) continue;
    if (!entry.name.endsWith(".md")) continue;

    const entityId = entry.name.replace(/\.md$/, "");
    if (!isUUID(entityId)) continue;

    if (!validIds.has(entityId)) {
      try {
        const filePath = paths.getFilePath(dataDir, entityId);
        await remove(filePath);
      } catch (error) {
        if (!isFileNotFoundError(error)) {
          console.error(
            `[${label}] Failed to remove orphan file ${entry.name}:`,
            error,
          );
        }
      }
    }
  }
}

export async function migrateJsonToMarkdown<T>(
  dataDir: string,
  jsonFilename: string,
  dirName: string,
  label: string,
  mapToFrontmatter: (
    id: string,
    entity: T,
  ) => { frontmatter: Record<string, JsonValue>; body: string },
): Promise<void> {
  const jsonPath = [dataDir, jsonFilename].join(sep());
  const paths = createEntityPaths(dirName);
  const entityDir = paths.getDir(dataDir);

  const jsonExists = await exists(jsonPath);
  if (!jsonExists) {
    return;
  }

  const dirExists = await exists(entityDir);
  if (dirExists) {
    return;
  }

  console.log(`[${label}] Migrating from ${jsonFilename} to ${dirName}/*.md`);

  try {
    const content = await readTextFile(jsonPath);
    const entities = JSON.parse(content) as Record<string, T>;

    await mkdir(entityDir, { recursive: true });

    const batchItems: [FrontmatterInput, string][] = [];

    for (const [entityId, entity] of Object.entries(entities)) {
      const { frontmatter, body } = mapToFrontmatter(entityId, entity);
      const filePath = paths.getFilePath(dataDir, entityId);
      batchItems.push([{ frontmatter, content: body }, filePath]);
    }

    if (batchItems.length > 0) {
      const result = await exportCommands.exportFrontmatterBatch(batchItems);
      if (result.status === "error") {
        throw new Error(`Failed to export migrated entities: ${result.error}`);
      }
    }

    await remove(jsonPath);

    console.log(
      `[${label}] Migration complete: ${Object.keys(entities).length} entities migrated`,
    );
  } catch (error) {
    if (!isFileNotFoundError(error)) {
      console.error(`[${label}] Migration failed:`, error);
    }
  }
}
