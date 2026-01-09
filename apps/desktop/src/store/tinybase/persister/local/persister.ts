import {
  createCustomSqlitePersister,
  DpcJson,
} from "tinybase/persisters/with-schemas";

import { commands as db2Commands } from "@hypr/plugin-db2";

import type { Store } from "../../store/main";
import { MergeableStoreOnly } from "../../store/shared";

// https://tinybase.org/api/persisters/functions/creation/createcustomsqlitepersister
export function createLocalPersister(
  store: Store,
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
      const interval = setInterval(() => listener(""), Math.pow(10, 1000));
      return interval;
    },
    (handle: NodeJS.Timeout) => {
      clearInterval(handle);
    },
    () => {},
    console.error.bind(console, "[LocalPersister]"),
    () => {},
    MergeableStoreOnly,
    null,
  );
}
