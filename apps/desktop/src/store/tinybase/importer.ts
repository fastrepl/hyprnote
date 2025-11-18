import {
  BaseDirectory,
  exists,
  readTextFile,
  remove,
} from "@tauri-apps/plugin-fs";
import { createMergeableStore } from "tinybase/with-schemas";

import { SCHEMA, type Store } from "./main";

export const maybeImportFromJson = async (store: Store) => {
  const path = "hyprnote/import/main.json";
  const baseDir = BaseDirectory.Data;

  if (!(await exists(path, { baseDir }))) {
    return;
  }

  try {
    const content = await readTextFile(path, { baseDir });
    const [tables, values] = JSON.parse(content) as [unknown, unknown];

    const importStore = createMergeableStore()
      .setTablesSchema(SCHEMA.table)
      .setValuesSchema(SCHEMA.value);

    if (tables) {
      importStore.setTables(tables as never);
    }
    if (values) {
      importStore.setValues(values as never);
    }
    store.merge(importStore);
    await remove(path, { baseDir });
  } catch (error) {
    console.error(error);
  }
};
