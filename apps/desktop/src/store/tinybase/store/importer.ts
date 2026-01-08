import { BaseDirectory, readTextFile, remove } from "@tauri-apps/plugin-fs";
import { createMergeableStore } from "tinybase/with-schemas";

import { SCHEMA } from "@hypr/store";
import { isValidTiptapContent, md2json } from "@hypr/tiptap/shared";

import type { Store } from "./main";

const IMPORT_PATH = "hyprnote/import.json";
const BASE_DIR = BaseDirectory.Data;

export type ImportResult =
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

const convertMarkdownToTiptapJson = (content: string): string => {
  if (!content || !content.trim()) {
    return content;
  }

  try {
    const parsed = JSON.parse(content);
    if (isValidTiptapContent(parsed)) {
      return content;
    }
  } catch {
    // Not JSON - treat as markdown
  }

  const tiptapJson = md2json(content);
  return JSON.stringify(tiptapJson);
};

type Tables = Record<string, Record<string, Record<string, unknown>>>;

const transformImportedTables = (tables: Tables): Tables => {
  if (tables.sessions) {
    for (const session of Object.values(tables.sessions)) {
      if (typeof session.raw_md === "string") {
        session.raw_md = convertMarkdownToTiptapJson(session.raw_md);
      }
    }
  }

  if (tables.enhanced_notes) {
    for (const note of Object.values(tables.enhanced_notes)) {
      if (typeof note.content === "string") {
        note.content = convertMarkdownToTiptapJson(note.content);
      }
    }
  }

  return tables;
};

const mergeImportData = (
  store: Store,
  { tables, values }: ParsedImport,
): { rowsImported: number; valuesImported: number } => {
  const importStore = createMergeableStore()
    .setTablesSchema(SCHEMA.table)
    .setValuesSchema(SCHEMA.value) as Store;

  if (tables) {
    const transformedTables = transformImportedTables(tables as Tables);
    importStore.setTables(
      transformedTables as Parameters<Store["setTables"]>[0],
    );
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

export const importFromJson = async (
  store: Store,
  onPersistComplete: () => Promise<void>,
): Promise<ImportResult> => {
  try {
    const content = await readTextFile(IMPORT_PATH, { baseDir: BASE_DIR });
    const parsed = parseImportContent(content);
    const { rowsImported, valuesImported } = mergeImportData(store, parsed);

    await onPersistComplete();
    await remove(IMPORT_PATH, { baseDir: BASE_DIR });

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
