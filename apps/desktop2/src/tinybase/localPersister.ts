import { createCustomSqlitePersister } from "tinybase/persisters";

import { commands as db2Commands } from "@hypr/plugin-db2";
import { mainStore } from ".";

export const localPersister = createCustomSqlitePersister(
  mainStore,
  { mode: "json" },
  async (sql: string, args: any[] = []): Promise<any> => (await db2Commands.executeLocal(sql, args)),
  () => {},
  (unsubscribeFunction: any): any => unsubscribeFunction(),
  console.log,
  console.error,
  () => {},
  2, // MergeableStoreOnly
  db2Commands,
  "getClient",
);
