import { commands as db2Commands } from "@hypr/plugin-db2";
import { createCustomSqlitePersister, type PersistedStore } from "tinybase/persisters";

import { MergeableStoreOnly } from "./const";

export const createLocalPersister = (store: PersistedStore<typeof MergeableStoreOnly>) =>
  createCustomSqlitePersister(
    store,
    { mode: "json" },
    async (sql: string, args: any[] = []): Promise<any> => (await db2Commands.executeLocal(sql, args)),
    () => {},
    (unsubscribeFunction: any): any => unsubscribeFunction(),
    console.log,
    console.error,
    () => {},
    MergeableStoreOnly,
    null,
  );
