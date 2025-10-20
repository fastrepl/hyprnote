import { createCustomSqlitePersister, DpcJson } from "tinybase/persisters/with-schemas";
import type { MergeableStore, OptionalSchemas } from "tinybase/with-schemas";

import { commands as db2Commands } from "@hypr/plugin-db2";
import { MergeableStoreOnly } from "./shared";

export function createLocalPersister<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
  config: Omit<DpcJson, "mode">,
) {
  return createCustomSqlitePersister(
    store,
    { mode: "json", ...config },
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
