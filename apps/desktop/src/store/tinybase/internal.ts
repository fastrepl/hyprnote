import * as _UI from "tinybase/ui-react/with-schemas";
import { createMergeableStore, createQueries, type MergeableStore } from "tinybase/with-schemas";

import { createBroadcastChannelSynchronizer } from "tinybase/synchronizers/synchronizer-broadcast-channel/with-schemas";
import { DEFAULT_USER_ID } from "../../utils";
import { internalSchemaForTinybase } from "./schema-internal";

export * from "./schema-internal";

export const STORE_ID = "internal";

const {
  useCreateMergeableStore,
  useCreateSynchronizer,
  useCreateQueries,
  useProvideStore,
  useProvideQueries,
  useProvideSynchronizer,
} = _UI as _UI.WithSchemas<Schemas>;

export const UI = _UI as _UI.WithSchemas<Schemas>;
export type Store = MergeableStore<Schemas>;
export type Schemas = [typeof internalSchemaForTinybase.table, typeof internalSchemaForTinybase.value];

export const createStore = () => {
  const store = createMergeableStore()
    .setTablesSchema(internalSchemaForTinybase.table)
    .setValuesSchema(internalSchemaForTinybase.value);

  return store;
};

export const useStore = () => {
  const store = useCreateMergeableStore(() => createStore());

  store.setValue("user_id", DEFAULT_USER_ID);

  const synchronizer = useCreateSynchronizer(
    store,
    async (store) =>
      createBroadcastChannelSynchronizer(
        store,
        "hypr-sync-internal",
      ).startSync(),
  );

  const queries = useCreateQueries(
    store,
    (store) =>
      createQueries(store)
        .setQueryDefinition(
          QUERIES.llmProviders,
          "ai_providers",
          ({ select, where }) => {
            select("type");
            select("base_url");
            select("api_key");
            where((getCell) => getCell("type") === "llm");
          },
        )
        .setQueryDefinition(
          QUERIES.sttProviders,
          "ai_providers",
          ({ select, where }) => {
            select("type");
            select("base_url");
            select("api_key");
            where((getCell) => getCell("type") === "stt");
          },
        ),
    [],
  )!;

  useProvideStore(STORE_ID, store);
  useProvideQueries(STORE_ID, queries);
  useProvideSynchronizer(STORE_ID, synchronizer);

  return store;
};

export const rowIdOfChange = (table: string, row: string) => `${table}:${row}`;

export const QUERIES = {
  llmProviders: "llmProviders",
  sttProviders: "sttProviders",
};
