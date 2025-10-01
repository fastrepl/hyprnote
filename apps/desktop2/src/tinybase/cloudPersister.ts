import {
  createCustomPostgreSqlPersister,
  type DpcTabular,
  type PersistedStore,
} from "tinybase/persisters/with-schemas";
import { type NoValuesSchema, type OptionalTablesSchema } from "tinybase/with-schemas";

import { commands as db2Commands } from "@hypr/plugin-db2";
import { MergeableStoreOnly } from "./shared";

export function createCloudPersister<Schema extends OptionalTablesSchema>(
  store: PersistedStore<[Schema, NoValuesSchema], typeof MergeableStoreOnly>,
  tables: DpcTabular<Schema>["tables"],
) {
  // We only use this persister for save, not load.
  const noopListener = async (_channel: string, _listener: any) => async () => {};

  return createCustomPostgreSqlPersister(
    store,
    { mode: "tabular", tables },
    async (sql: string, args: any[] = []): Promise<any[]> => (await db2Commands.executeCloud(sql, args)),
    noopListener,
    (unsubscribeFunction: any): any => unsubscribeFunction(),
    console.log,
    console.error,
    () => {},
    MergeableStoreOnly,
    null,
  );
}
