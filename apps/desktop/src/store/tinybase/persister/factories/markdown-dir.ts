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
  type JsonValue,
  type ParsedDocument,
} from "@hypr/plugin-fs-sync";

import {
  createDeletionMarker,
  type DeletionMarkerStore,
} from "../shared/deletion-marker";
import { isFileNotFoundError } from "../shared/fs";
import {
  buildEntityFilePath,
  buildEntityPath,
  getDataDir,
} from "../shared/paths";
import { type ChangedTables, type WriteOperation } from "../shared/types";
import { asTablesChanges } from "../shared/utils";
import { createCollectorPersister } from "./collector";

export interface MarkdownDirPersisterConfig<
  TStorage extends Record<string, unknown>,
> {
  tableName: string;
  dirName: string;
  label: string;
  entityParser: (path: string) => string | null;
  toFrontmatter: (entity: TStorage) => {
    frontmatter: Record<string, JsonValue>;
    body: string;
  };
  fromFrontmatter: (
    frontmatter: Record<string, unknown>,
    body: string,
  ) => TStorage;
}

type LoadedData<TStorage extends Record<string, unknown>> = {
  [tableName: string]: Record<string, TStorage>;
};

async function loadMarkdownDir<TStorage extends Record<string, unknown>>(
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

function collectMarkdownWriteOps<TStorage extends Record<string, unknown>>(
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

async function loadSingleEntity<
  Schemas extends OptionalSchemas,
  TStorage extends Record<string, unknown>,
>(
  config: MarkdownDirPersisterConfig<TStorage>,
  entityId: string,
  deletionMarker: ReturnType<typeof createDeletionMarker<LoadedData<TStorage>>>,
) {
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
    }) as unknown as PersistedChanges<Schemas, Persists.StoreOrMergeableStore>;
  } catch (error) {
    if (isFileNotFoundError(error)) {
      const loaded = { [tableName]: {} } as LoadedData<TStorage>;
      const result = deletionMarker.markForEntity(loaded, entityId);

      if (Object.keys(result[tableName] ?? {}).length > 0) {
        return asTablesChanges(
          result as Record<
            string,
            Record<string, Record<string, unknown> | undefined>
          >,
        ) as unknown as PersistedChanges<
          Schemas,
          Persists.StoreOrMergeableStore
        >;
      }
    }
    return undefined;
  }
}

export function createMarkdownDirPersister<
  Schemas extends OptionalSchemas,
  TStorage extends Record<string, unknown>,
>(
  store: MergeableStore<Schemas>,
  config: MarkdownDirPersisterConfig<TStorage>,
): ReturnType<typeof createCollectorPersister<Schemas>> {
  const { tableName, dirName, label, entityParser } = config;

  const deletionMarker = createDeletionMarker<LoadedData<TStorage>>(
    store as DeletionMarkerStore,
    [{ tableName, isPrimary: true }],
  );

  return createCollectorPersister(store, {
    label,
    watchPaths: [`${dirName}/`],
    cleanup: (tables) => [
      {
        type: "files",
        subdir: dirName,
        extension: "md",
        keepIds: Object.keys(
          (tables as Record<string, Record<string, unknown>>)[tableName] ?? {},
        ),
      },
    ],
    entityParser,
    loadSingle: (entityId: string) =>
      loadSingleEntity(config, entityId, deletionMarker),
    save: (_store, tables, dataDir, changedTables) => {
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
    load: async () => {
      const dataDir = await getDataDir();
      const entities = await loadMarkdownDir(dataDir, config);

      const loaded = { [tableName]: entities } as LoadedData<TStorage>;
      const result = deletionMarker.markAll(loaded);

      if (Object.keys(result[tableName] ?? {}).length === 0) {
        return undefined;
      }

      return asTablesChanges(
        result as Record<
          string,
          Record<string, Record<string, unknown> | undefined>
        >,
      ) as unknown as Content<Schemas>;
    },
  });
}
