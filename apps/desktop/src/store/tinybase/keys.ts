import { useEffect } from "react";
import { createBroadcastChannelSynchronizer } from "tinybase/synchronizers/synchronizer-broadcast-channel/with-schemas";
import * as _UI from "tinybase/ui-react/with-schemas";
import {
  createMergeableStore,
  createQueries,
  type MergeableStore,
  type TablesSchema,
  type ValuesSchema,
} from "tinybase/with-schemas";

import { getCurrentWebviewWindowLabel } from "@hypr/plugin-windows";

import { createJsonPersister } from "./jsonPersister";
import * as main from "./main";
import { registerSaveHandler } from "./save";

export const STORE_ID = "keys";

const SCHEMA = {
  value: {} satisfies ValuesSchema,
  table: {
    ai_providers: {
      type: { type: "string" },
      base_url: { type: "string" },
      api_key: { type: "string" },
    },
  } satisfies TablesSchema,
} as const;

type Schemas = [typeof SCHEMA.table, typeof SCHEMA.value];

const {
  useCreateMergeableStore,
  useCreatePersister,
  useCreateSynchronizer,
  useCreateQueries,
  useProvideStore,
  useProvidePersister,
  useProvideSynchronizer,
  useProvideQueries,
} = _UI as _UI.WithSchemas<Schemas>;

export const UI = _UI as _UI.WithSchemas<Schemas>;
export type Store = MergeableStore<Schemas>;

export const QUERIES = {
  llmProviders: "llmProviders",
  sttProviders: "sttProviders",
} as const;

export const StoreComponent = ({ persist = true }: { persist?: boolean }) => {
  const mainStore = main.UI.useStore(main.STORE_ID);

  const store = useCreateMergeableStore(() =>
    createMergeableStore()
      .setTablesSchema(SCHEMA.table)
      .setValuesSchema(SCHEMA.value),
  );

  const persister = useCreatePersister(
    store,
    async (store) => {
      if (!persist) {
        return undefined;
      }

      const jsonPersister = createJsonPersister<Schemas>(
        store as Store,
        "keys.json",
      );

      await jsonPersister.load();

      if (mainStore) {
        migrateFromMainStore(mainStore as main.Store, store as Store);
        await jsonPersister.save();
      }

      await jsonPersister.startAutoPersisting();
      return jsonPersister;
    },
    [persist, mainStore],
  );

  useEffect(() => {
    if (!persist || !persister) {
      return;
    }

    if (getCurrentWebviewWindowLabel() !== "main") {
      return;
    }

    return registerSaveHandler(async () => {
      await persister.save();
    });
  }, [persister, persist]);

  const synchronizer = useCreateSynchronizer(store, async (store) =>
    createBroadcastChannelSynchronizer(store, "hypr-sync-keys").startSync(),
  );

  const queries = useCreateQueries(store, (store) =>
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
  );

  useProvideStore(STORE_ID, store);
  useProvideQueries(STORE_ID, queries!);
  useProvidePersister(STORE_ID, persist ? persister : undefined);
  useProvideSynchronizer(STORE_ID, synchronizer);

  return null;
};

function migrateFromMainStore(mainStore: main.Store, keysStore: Store) {
  const mainProviders = mainStore.getTable("ai_providers");

  if (!mainProviders || Object.keys(mainProviders).length === 0) {
    return;
  }

  for (const [rowId, row] of Object.entries(mainProviders)) {
    if (row.api_key || row.base_url) {
      keysStore.setRow("ai_providers", rowId, {
        type: row.type ?? "",
        base_url: row.base_url ?? "",
        api_key: row.api_key ?? "",
      });
    }
    mainStore.delRow("ai_providers", rowId);
  }
}
