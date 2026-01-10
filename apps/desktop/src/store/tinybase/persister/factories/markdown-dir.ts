import { readTextFile } from "@tauri-apps/plugin-fs";
import type {
  PersistedChanges,
  Persists,
} from "tinybase/persisters/with-schemas";
import type {
  Content,
  MergeableStore,
  OptionalSchemas,
} from "tinybase/with-schemas";

import {
  commands as fsSyncCommands,
  type ParsedDocument,
} from "@hypr/plugin-fs-sync";

import { isFileNotFoundError } from "../shared/fs";
import {
  buildEntityFilePath,
  buildEntityPath,
  getDataDir,
} from "../shared/paths";
import {
  type ChangedTables,
  type MarkdownDirPersisterConfig,
  type TablesContent,
  type WriteOperation,
} from "../shared/types";
import { asTablesChanges } from "../shared/utils";
import { createCollectorPersister } from "./collector";

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
): WriteOperation[] {
  const { dirName, toFrontmatter } = config;
  const operations: WriteOperation[] = [];

  const documentItems: [ParsedDocument, string][] = [];

  for (const [entityId, entity] of Object.entries(tableData)) {
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

  return operations;
}

async function loadSingleEntity<TStorage>(
  store: MergeableStore<any>,
  config: MarkdownDirPersisterConfig<TStorage>,
  entityId: string,
): Promise<PersistedChanges<any, Persists.StoreOrMergeableStore> | undefined> {
  const { tableName, dirName, fromFrontmatter } = config;
  const dataDir = await getDataDir();
  const filePath = buildEntityFilePath(dataDir, dirName, entityId);

  try {
    const content = await readTextFile(filePath);
    const parseResult = await fsSyncCommands.deserialize(content);

    if (parseResult.status === "error") {
      return undefined;
    }

    const entity = fromFrontmatter(
      parseResult.data.frontmatter as Record<string, unknown>,
      parseResult.data.content.trim(),
    );

    return asTablesChanges({
      [tableName]: { [entityId]: entity as Record<string, unknown> },
    }) as unknown as PersistedChanges<any, Persists.StoreOrMergeableStore>;
  } catch (error) {
    if (isFileNotFoundError(error)) {
      const existingRow = store.getRow(tableName as any, entityId);
      if (existingRow && Object.keys(existingRow).length > 0) {
        return asTablesChanges({
          [tableName]: { [entityId]: undefined },
        }) as unknown as PersistedChanges<any, Persists.StoreOrMergeableStore>;
      }
    }
    return undefined;
  }
}

export function createMarkdownDirPersister<
  Schemas extends OptionalSchemas,
  TStorage,
>(
  store: MergeableStore<Schemas>,
  config: MarkdownDirPersisterConfig<TStorage>,
): ReturnType<typeof createCollectorPersister<Schemas>> {
  const { tableName, dirName, label, entityParser } = config;

  const getValidIds = (tables: TablesContent): Set<string> =>
    new Set(
      Object.keys(
        (tables as Record<string, Record<string, unknown>>)[tableName] ?? {},
      ),
    );

  return createCollectorPersister(store, {
    label,
    watchPaths: [`${dirName}/`],
    cleanup: [
      {
        type: "files",
        subdir: dirName,
        extension: "md",
        getValidIds,
      },
    ],
    entityParser,
    loadSingle: (entityId: string) => loadSingleEntity(store, config, entityId),
    collect: (_store, tables, dataDir, changedTables) => {
      const fullTableData =
        (tables as Record<string, Record<string, TStorage>>)[tableName] ?? {};

      if (changedTables) {
        const changedRows = changedTables[tableName as keyof ChangedTables];

        if (!changedRows) {
          return { operations: [] };
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

        const writeOps = collectMarkdownWriteOps(
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
          operations: [...writeOps, ...deleteOps],
        };
      }

      return {
        operations: collectMarkdownWriteOps(fullTableData, dataDir, config),
      };
    },
    load: async (): Promise<Content<Schemas> | undefined> => {
      const dataDir = await getDataDir();
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
  });
}
