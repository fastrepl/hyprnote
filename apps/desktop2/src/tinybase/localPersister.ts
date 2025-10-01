import { createCustomSqlitePersister } from "tinybase/persisters/with-schemas";
import type { MergeableStore, OptionalSchemas } from "tinybase/with-schemas";

import { commands as db2Commands } from "@hypr/plugin-db2";
import { MergeableStoreOnly } from "./shared";

export function createLocalPersister<Schemas extends OptionalSchemas>(store: MergeableStore<Schemas>) {
  return createCustomSqlitePersister(
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
}
