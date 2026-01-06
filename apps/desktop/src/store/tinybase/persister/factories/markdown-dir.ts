import { exists, mkdir, readTextFile, remove } from "@tauri-apps/plugin-fs";
import type {
  Content,
  MergeableStore,
  OptionalSchemas,
} from "tinybase/with-schemas";

import {
  commands as fsSyncCommands,
  type ParsedDocument,
} from "@hypr/plugin-fs-sync";

import {
  getDataDir,
  getMarkdownDir,
  getMarkdownFilePath,
} from "../shared/paths";
import type {
  CollectorResult,
  MarkdownDirPersisterConfig,
  PersistedChanges,
} from "../shared/types";
import { createCollectorPersister } from "./collector";

async function migrateFromLegacyJson<TStorage>(
  dataDir: string,
  config: MarkdownDirPersisterConfig<TStorage>,
): Promise<void> {
  const { dirName, legacyJsonPath, toFrontmatter } = config;
  const jsonPath = [dataDir, legacyJsonPath].join("/");
  const entityDir = getMarkdownDir(dataDir, dirName);

  const jsonExists = await exists(jsonPath);
  if (!jsonExists) {
    return;
  }

  const dirExists = await exists(entityDir);
  if (dirExists) {
    return;
  }

  try {
    const content = await readTextFile(jsonPath);
    const entities = JSON.parse(content) as Record<string, TStorage>;

    await mkdir(entityDir, { recursive: true });

    const batchItems: [ParsedDocument, string][] = [];
    for (const [entityId, entity] of Object.entries(entities)) {
      const { frontmatter, body } = toFrontmatter(entity);
      const filePath = getMarkdownFilePath(dataDir, dirName, entityId);
      batchItems.push([{ frontmatter, content: body }, filePath]);
    }

    if (batchItems.length > 0) {
      const result = await fsSyncCommands.writeFrontmatterBatch(batchItems);
      if (result.status === "error") {
        throw new Error(
          `Failed to serialize frontmatter batch: ${result.error}`,
        );
      }
    }

    await remove(jsonPath);
  } catch {
    // Ignore migration errors
  }
}

async function loadMarkdownDir<TStorage>(
  dataDir: string,
  config: MarkdownDirPersisterConfig<TStorage>,
): Promise<Record<string, TStorage>> {
  const { dirName, fromFrontmatter } = config;
  const dir = getMarkdownDir(dataDir, dirName);
  const result = await fsSyncCommands.readFrontmatterBatch(dir);

  if (result.status === "error") {
    return {};
  }

  const entities: Record<string, TStorage> = {};
  for (const [id, doc] of Object.entries(result.data)) {
    if (doc) {
      entities[id] = fromFrontmatter(
        doc.frontmatter as Record<string, unknown>,
        doc.content.trim(),
      );
    }
  }
  return entities;
}

function collectMarkdownWriteOps<TStorage>(
  tableData: Record<string, TStorage>,
  dataDir: string,
  config: MarkdownDirPersisterConfig<TStorage>,
): { result: CollectorResult; validIds: Set<string> } {
  const { dirName, toFrontmatter } = config;
  const dirs = new Set<string>();
  const operations: CollectorResult["operations"] = [];
  const validIds = new Set<string>();

  const entityDir = getMarkdownDir(dataDir, dirName);
  dirs.add(entityDir);

  const frontmatterItems: [ParsedDocument, string][] = [];

  for (const [entityId, entity] of Object.entries(tableData)) {
    validIds.add(entityId);

    const { frontmatter, body } = toFrontmatter(entity);
    const filePath = getMarkdownFilePath(dataDir, dirName, entityId);

    frontmatterItems.push([{ frontmatter, content: body }, filePath]);
  }

  if (frontmatterItems.length > 0) {
    operations.push({
      type: "frontmatter-batch",
      items: frontmatterItems,
    });
  }

  return { result: { dirs, operations }, validIds };
}

export function createMarkdownDirPersister<
  Schemas extends OptionalSchemas,
  TStorage,
>(
  store: MergeableStore<Schemas>,
  config: MarkdownDirPersisterConfig<TStorage>,
): ReturnType<typeof createCollectorPersister<Schemas>> {
  const { tableName, dirName, label } = config;

  return createCollectorPersister(store, {
    label,
    collect: (_store, tables, dataDir, changes) => {
      const fullTableData =
        (tables as Record<string, Record<string, TStorage>>)[tableName] ?? {};

      if (changes) {
        const [changedTables] = changes;
        const changedRows = changedTables[
          tableName as keyof typeof changedTables
        ] as Record<string, unknown> | undefined;
        if (!changedRows) {
          return { dirs: new Set(), operations: [], validIds: new Set() };
        }

        const changedIds = Object.keys(changedRows);
        const filteredTableData: Record<string, TStorage> = {};
        for (const id of changedIds) {
          const row = fullTableData[id];
          if (row) {
            filteredTableData[id] = row;
          }
        }

        const { result } = collectMarkdownWriteOps(
          filteredTableData,
          dataDir,
          config,
        );
        return { ...result, validIds: new Set<string>() };
      }

      const { result, validIds } = collectMarkdownWriteOps(
        fullTableData,
        dataDir,
        config,
      );
      return { ...result, validIds };
    },
    load: async (): Promise<Content<Schemas> | undefined> => {
      const dataDir = await getDataDir();
      await migrateFromLegacyJson(dataDir, config);
      const entities = await loadMarkdownDir(dataDir, config);
      if (Object.keys(entities).length === 0) {
        return undefined;
      }
      return [{ [tableName]: entities }, {}] as unknown as Content<Schemas>;
    },
    postSave: async (_dataDir, result) => {
      const { validIds } = result as CollectorResult & {
        validIds: Set<string>;
      };
      await fsSyncCommands.cleanupOrphanFiles(
        dirName,
        "md",
        Array.from(validIds),
      );
    },
  });
}
