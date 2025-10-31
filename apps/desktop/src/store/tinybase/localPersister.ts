import { createCustomSqlitePersister, DpcJson } from "tinybase/persisters/with-schemas";
import type { MergeableStore, OptionalSchemas } from "tinybase/with-schemas";

import { commands as db2Commands } from "@hypr/plugin-db2";
import { MergeableStoreOnly } from "./shared";

// https://tinybase.org/api/persisters/functions/creation/createcustomsqlitepersister
export function createLocalPersister<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
  config: Omit<DpcJson, "mode">,
) {
  return createCustomSqlitePersister(
    store,
    {
      // https://tinybase.org/guides/synchronization/using-a-mergeablestore/
      mode: "json",
      ...config,
    },
    async (sql: string, args: any[] = []): Promise<any> => {
      const r = await db2Commands.executeLocal(sql, args);
      if (r.status === "error") {
        console.error(r.error);
        return [];
      }
      return r.data;
    },
    (listener: (tableName: string) => void) => {
      const interval = setInterval(() => listener(""), 1000);
      return interval;
    },
    (handle: NodeJS.Timeout) => {
      clearInterval(handle);
    },
    false ? console.log.bind(console, "[LocalPersister]") : () => {},
    true ? console.error.bind(console, "[LocalPersister]") : () => {},
    () => {},
    MergeableStoreOnly,
    null,
  );
}
