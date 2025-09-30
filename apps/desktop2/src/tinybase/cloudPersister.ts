import { commands as db2Commands } from "@hypr/plugin-db2";
import { createCustomPostgreSqlPersister, PersistedStore } from "tinybase/persisters";

import { mainTables } from ".";
import { MergeableStoreOnly } from "./const";

export const createCloudPersister = (store: PersistedStore<typeof MergeableStoreOnly>) =>
  createCustomPostgreSqlPersister(
    store,
    { mode: "tabular", tables: mainTables },
    async (sql: string, args: any[] = []): Promise<any[]> => (await db2Commands.executeCloud(sql, args)),
    async (_channel: string, _listener: any) => async () => {},
    (unsubscribeFunction: any): any => unsubscribeFunction(),
    console.log,
    console.error,
    () => {},
    MergeableStoreOnly,
    null,
  );
