import {
  BaseDirectory,
  exists,
  readTextFile,
  remove,
  rename,
} from "@tauri-apps/plugin-fs";
import { createMergeableStore } from "tinybase/with-schemas";

import { getCurrentWebviewWindowLabel } from "@hypr/plugin-windows";
import { SCHEMA } from "@hypr/store";

import type { Store } from "./main";

const IMPORT_PATH = "hyprnote/import.json";
const IMPORT_PROCESSING_PATH = "hyprnote/import.processing.json";
const BASE_DIR = BaseDirectory.Data;

export type ImportResult =
  | { status: "skipped"; reason: "not_main_window" | "no_import_file" }
  | { status: "success"; rowsImported: number; valuesImported: number }
  | { status: "error"; error: string };

type ParsedImport = {
  tables: object | null;
  values: object | null;
};

const parseImportContent = (content: string): ParsedImport => {
  const parsed = JSON.parse(content) as unknown;
  if (!Array.isArray(parsed) || parsed.length !== 2) {
    throw new Error("Invalid import format: expected [tables, values] array");
  }

  const [tables, values] = parsed as [unknown, unknown];

  if (tables !== null && typeof tables !== "object") {
    throw new Error("Invalid import format: tables must be an object or null");
  }
  if (values !== null && typeof values !== "object") {
    throw new Error("Invalid import format: values must be an object or null");
  }

  return { tables: tables as object | null, values: values as object | null };
};

const countRows = (tables: object | null): number => {
  if (!tables) return 0;
  let count = 0;
  for (const tableData of Object.values(tables)) {
    if (tableData && typeof tableData === "object") {
      count += Object.keys(tableData).length;
    }
  }
  return count;
};

const mergeImportData = (
  store: Store,
  { tables, values }: ParsedImport,
): { rowsImported: number; valuesImported: number } => {
  const importStore = createMergeableStore()
    .setTablesSchema(SCHEMA.table)
    .setValuesSchema(SCHEMA.value) as Store;

  if (tables) {
    importStore.setTables(tables as Parameters<Store["setTables"]>[0]);
  }

  if (values) {
    importStore.setValues(values as Parameters<Store["setValues"]>[0]);
  }

  store.transaction(() => {
    store.merge(importStore);
  });

  return {
    rowsImported: countRows(tables),
    valuesImported: values ? Object.keys(values).length : 0,
  };
};

export const maybeImportFromJson = async (
  store: Store,
  onPersistComplete: () => Promise<void>,
): Promise<ImportResult> => {
  if (getCurrentWebviewWindowLabel() !== "main") {
    return { status: "skipped", reason: "not_main_window" };
  }

  const hasImportFile = await exists(IMPORT_PATH, { baseDir: BASE_DIR });
  const hasProcessingFile = await exists(IMPORT_PROCESSING_PATH, {
    baseDir: BASE_DIR,
  });

  if (!hasImportFile && !hasProcessingFile) {
    return { status: "skipped", reason: "no_import_file" };
  }

  const workingPath = IMPORT_PROCESSING_PATH;

  try {
    if (hasImportFile) {
      await rename(IMPORT_PATH, IMPORT_PROCESSING_PATH, {
        oldPathBaseDir: BASE_DIR,
        newPathBaseDir: BASE_DIR,
      });
    }

    const content = await readTextFile(workingPath, { baseDir: BASE_DIR });
    const parsed = parseImportContent(content);
    const { rowsImported, valuesImported } = mergeImportData(store, parsed);

    await onPersistComplete();
    await remove(workingPath, { baseDir: BASE_DIR });

    console.log(
      `[Importer] Successfully imported ${rowsImported} rows and ${valuesImported} values`,
    );

    return { status: "success", rowsImported, valuesImported };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[Importer] Import failed:", errorMessage);
    return { status: "error", error: errorMessage };
  }
};

export const importFromFile = async (
  store: Store,
  filePath: string,
  onPersistComplete: () => Promise<void>,
): Promise<ImportResult> => {
  try {
    const content = await readTextFile(filePath);
    const parsed = parseImportContent(content);
    const { rowsImported, valuesImported } = mergeImportData(store, parsed);

    await onPersistComplete();

    console.log(
      `[Importer] Successfully imported ${rowsImported} rows and ${valuesImported} values from ${filePath}`,
    );

    return { status: "success", rowsImported, valuesImported };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[Importer] Import failed:", errorMessage);
    return { status: "error", error: errorMessage };
  }
};
