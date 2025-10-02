import { createCustomSqlitePersister } from "tinybase/persisters/with-schemas";
import type { MergeableStore, OptionalSchemas } from "tinybase/with-schemas";

import { commands as db2Commands } from "@hypr/plugin-db2";
import { MergeableStoreOnly } from "./shared";

export const LOCAL_PERSISTER_ID = "local-persister";

export function createLocalPersister<Schemas extends OptionalSchemas>(store: MergeableStore<Schemas>) {
  return createCustomSqlitePersister(
    store,
    { mode: "json" },
    async (sql: string, args: any[] = []): Promise<any> => (await db2Commands.executeLocal(sql, args)),
    () => {},
    (unsubscribeFunction: any): any => unsubscribeFunction(),
    false ? console.log.bind(console, "[LocalPersister]") : () => {},
    false ? console.error.bind(console, "[LocalPersister]") : () => {},
    () => {},
    MergeableStoreOnly,
    null,
  );
}
