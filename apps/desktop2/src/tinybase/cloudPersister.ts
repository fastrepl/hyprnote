import { createCustomPostgreSqlPersister } from "tinybase/persisters";

import { commands as db2Commands } from "@hypr/plugin-db2";
import { mainStore, mainTables } from ".";

export const postgresPersister = createCustomPostgreSqlPersister(
  mainStore,
  { mode: "tabular", tables: mainTables },
  async (sql: string, args: any[] = []): Promise<any[]> => (await db2Commands.executeCloud(sql, args)),
  async (_channel: string, _listener: any) => async () => {},
  (unsubscribeFunction: any): any => unsubscribeFunction(),
  console.log,
  console.error,
  () => {},
  2, // MergeableStoreOnly
  db2Commands,
  "executeLocal",
);
