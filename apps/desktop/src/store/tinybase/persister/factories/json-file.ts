import { sep } from "@tauri-apps/api/path";
import { mkdir, readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { createCustomPersister } from "tinybase/persisters/with-schemas";
import type { MergeableStore, OptionalSchemas } from "tinybase/with-schemas";

import { commands as path2Commands } from "@hypr/plugin-path2";

import { StoreOrMergeableStore } from "../../store/shared";
import { createNotifyListener, isFileNotFoundError } from "../shared/fs";
import { asTablesChanges, type PersistedChanges } from "../shared/types";

async function loadTableData(
  filename: string,
  label: string,
): Promise<Record<string, Record<string, unknown>> | undefined> {
  try {
    const base = await path2Commands.base();
    const content = await readTextFile([base, filename].join(sep()));
    return JSON.parse(content);
  } catch (error) {
    if (!isFileNotFoundError(error)) {
      console.error(`[${label}] load error:`, error);
    }
    return undefined;
  }
}

export function createJsonFilePersister<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
  options: {
    tableName: string;
    filename: string;
    label: string;
  },
) {
  const { tableName, filename, label } = options;

  const notifyListener = createNotifyListener((path) =>
    path.endsWith(filename),
  );

  return createCustomPersister(
    store,
    async () => {
      const data = await loadTableData(filename, label);
      if (!data) return undefined;
      return asTablesChanges({ [tableName]: data }) as any;
    },
    async (_getContent: () => unknown, changes?: PersistedChanges) => {
      if (changes) {
        const [changedTables] = changes;
        if (!changedTables[tableName as keyof typeof changedTables]) {
          return;
        }
      }

      try {
        const base = await path2Commands.base();
        await mkdir(base, { recursive: true });
        const data = (store.getTable(tableName as any) ?? {}) as Record<
          string,
          unknown
        >;
        await writeTextFile(
          [base, filename].join(sep()),
          JSON.stringify(data, null, 2),
        );
      } catch (error) {
        console.error(`[${label}] save error:`, error);
      }
    },
    (listener) => {
      return notifyListener.addListener(async () => {
        const data = await loadTableData(filename, label);
        if (data) {
          listener(undefined, asTablesChanges({ [tableName]: data }) as any);
        }
      });
    },
    notifyListener.delListener,
    (error) => console.error(`[${label}]:`, error),
    StoreOrMergeableStore,
  );
}
