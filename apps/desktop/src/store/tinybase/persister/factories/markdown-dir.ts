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
  buildEntityFilePath,
  buildEntityPath,
  getDataDir,
} from "../shared/paths";
import {
  asTablesChanges,
  type ChangedTables,
  type CollectorResult,
  type MarkdownDirPersisterConfig,
  type WriteOperation,
} from "../shared/types";
import { createCollectorPersister } from "./collector";

async function migrateFromLegacyJson<TStorage>(
  dataDir: string,
  config: MarkdownDirPersisterConfig<TStorage>,
): Promise<void> {
  const { dirName, legacyJsonPath, toFrontmatter } = config;
  const jsonPath = [dataDir, legacyJsonPath].join("/");
  const entityDir = buildEntityPath(dataDir, dirName);

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
      const filePath = buildEntityFilePath(dataDir, dirName, entityId);
      batchItems.push([{ frontmatter, content: body }, filePath]);
    }

    if (batchItems.length > 0) {
      const result = await fsSyncCommands.writeDocumentBatch(batchItems);
      if (result.status === "error") {
        throw new Error(`Failed to write document batch: ${result.error}`);
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
  const dir = buildEntityPath(dataDir, dirName);
  const result = await fsSyncCommands.readDocumentBatch(dir);

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
  const operations: CollectorResult["operations"] = [];
  const validIds = new Set<string>();

  const documentItems: [ParsedDocument, string][] = [];

  for (const [entityId, entity] of Object.entries(tableData)) {
    validIds.add(entityId);

    const { frontmatter, body } = toFrontmatter(entity);
    const filePath = buildEntityFilePath(dataDir, dirName, entityId);

    documentItems.push([{ frontmatter, content: body }, filePath]);
  }

  if (documentItems.length > 0) {
    operations.push({
      type: "document-batch",
      items: documentItems,
    });
  }

  return { result: { operations }, validIds };
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
    watchPaths: [`${dirName}/`],
    collect: (_store, tables, dataDir, changedTables) => {
      const fullTableData =
        (tables as Record<string, Record<string, TStorage>>)[tableName] ?? {};

      if (changedTables) {
        const changedRows = changedTables[tableName as keyof ChangedTables];
        const allValidIds = new Set(Object.keys(fullTableData));

        if (!changedRows) {
          return { operations: [], validIds: allValidIds };
        }

        const changedIds = Object.keys(changedRows);
        const filteredTableData: Record<string, TStorage> = {};
        const deletedIds: string[] = [];

        for (const id of changedIds) {
          const row = fullTableData[id];
          if (row) {
            filteredTableData[id] = row;
          } else {
            deletedIds.push(id);
          }
        }

        const { result } = collectMarkdownWriteOps(
          filteredTableData,
          dataDir,
          config,
        );

        const deleteOps: WriteOperation[] =
          deletedIds.length > 0
            ? [
                {
                  type: "delete-batch",
                  paths: deletedIds.map((id) =>
                    buildEntityFilePath(dataDir, dirName, id),
                  ),
                },
              ]
            : [];

        return {
          operations: [...result.operations, ...deleteOps],
          validIds: allValidIds,
        };
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

      const existingTable = store.getTable(tableName as any) ?? {};
      const existingIds = new Set(Object.keys(existingTable));
      const loadedIds = new Set(Object.keys(entities));

      const result: Record<string, TStorage | undefined> = { ...entities };
      for (const id of existingIds) {
        if (!loadedIds.has(id)) {
          result[id] = undefined;
        }
      }

      if (Object.keys(result).length === 0) {
        return undefined;
      }

      return asTablesChanges({
        [tableName]: result as Record<
          string,
          Record<string, unknown> | undefined
        >,
      }) as unknown as Content<Schemas>;
    },
    postSave: async (_dataDir, result) => {
      const { validIds } = result as CollectorResult & {
        validIds: Set<string>;
      };
      await fsSyncCommands.cleanupOrphan(
        { type: "files", subdir: dirName, extension: "md" },
        Array.from(validIds),
      );
    },
  });
}
