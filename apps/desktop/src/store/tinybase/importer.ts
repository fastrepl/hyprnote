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
  | { status: "success"; tablesImported: number; valuesImported: number }
  | { status: "error"; error: string };

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

    const parsed = JSON.parse(content) as unknown;
    if (!Array.isArray(parsed) || parsed.length !== 2) {
      throw new Error("Invalid import format: expected [tables, values] array");
    }

    const [tables, values] = parsed as [unknown, unknown];

    if (tables !== null && typeof tables !== "object") {
      throw new Error(
        "Invalid import format: tables must be an object or null",
      );
    }
    if (values !== null && typeof values !== "object") {
      throw new Error(
        "Invalid import format: values must be an object or null",
      );
    }

    const importStore = createMergeableStore()
      .setTablesSchema(SCHEMA.table)
      .setValuesSchema(SCHEMA.value) as Store;

    let tablesImported = 0;
    let valuesImported = 0;

    if (tables && typeof tables === "object") {
      importStore.setTables(tables as Parameters<Store["setTables"]>[0]);
      tablesImported = Object.keys(tables).length;
    }

    if (values && typeof values === "object") {
      importStore.setValues(values as Parameters<Store["setValues"]>[0]);
      valuesImported = Object.keys(values).length;
    }

    store.transaction(() => {
      store.merge(importStore);
    });

    await onPersistComplete();

    await remove(workingPath, { baseDir: BASE_DIR });

    console.log(
      `[Importer] Successfully imported ${tablesImported} tables and ${valuesImported} values`,
    );

    return { status: "success", tablesImported, valuesImported };
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

    const parsed = JSON.parse(content) as unknown;
    if (!Array.isArray(parsed) || parsed.length !== 2) {
      throw new Error("Invalid import format: expected [tables, values] array");
    }

    const [tables, values] = parsed as [unknown, unknown];

    if (tables !== null && typeof tables !== "object") {
      throw new Error(
        "Invalid import format: tables must be an object or null",
      );
    }
    if (values !== null && typeof values !== "object") {
      throw new Error(
        "Invalid import format: values must be an object or null",
      );
    }

    const importStore = createMergeableStore()
      .setTablesSchema(SCHEMA.table)
      .setValuesSchema(SCHEMA.value) as Store;

    let tablesImported = 0;
    let valuesImported = 0;

    if (tables && typeof tables === "object") {
      importStore.setTables(tables as Parameters<Store["setTables"]>[0]);
      tablesImported = Object.keys(tables).length;
    }

    if (values && typeof values === "object") {
      importStore.setValues(values as Parameters<Store["setValues"]>[0]);
      valuesImported = Object.keys(values).length;
    }

    store.transaction(() => {
      store.merge(importStore);
    });

    await onPersistComplete();

    console.log(
      `[Importer] Successfully imported ${tablesImported} tables and ${valuesImported} values from ${filePath}`,
    );

    return { status: "success", tablesImported, valuesImported };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[Importer] Import failed:", errorMessage);
    return { status: "error", error: errorMessage };
  }
};
