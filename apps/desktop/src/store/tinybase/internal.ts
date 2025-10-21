import * as _UI from "tinybase/ui-react/with-schemas";
import { createMergeableStore, createQueries, type MergeableStore, type TablesSchema } from "tinybase/with-schemas";
import { z } from "zod";

import { createBroadcastChannelSynchronizer } from "tinybase/synchronizers/synchronizer-broadcast-channel/with-schemas";
import { DEFAULT_USER_ID } from "../../utils";
import { createLocalPersister } from "./localPersister";
import { type InferTinyBaseSchema, jsonObject, type ToStorageType } from "./shared";

export const generalSchema = z.object({
  user_id: z.string(),
  autostart: z.boolean().default(false),
  telemetry_consent: z.boolean().default(true),
  save_recordings: z.boolean().default(true),
  notification_event: z.boolean().default(true),
  notification_detect: z.boolean().default(true),
  ai_language: z.string().default("en"),
  spoken_languages: jsonObject(z.array(z.string()).default(["en"])),
  jargons: jsonObject(z.array(z.string()).default([])),
  current_llm_provider: z.string().optional(),
  current_llm_model: z.string().optional(),
  current_stt_provider: z.string().optional(),
  current_stt_model: z.string().optional(),
});

export const aiProviderSchema = z.object({
  type: z.enum(["stt", "llm"]),
  base_url: z.url().min(1),
  api_key: z.string(),
});

export type AIProvider = z.infer<typeof aiProviderSchema>;
export type AIProviderStorage = ToStorageType<typeof aiProviderSchema>;

export type General = z.infer<typeof generalSchema>;
export type GeneralStorage = ToStorageType<typeof generalSchema>;

export const STORE_ID = "internal";

export const SCHEMA = {
  value: {
    user_id: { type: "string" },
    autostart: { type: "boolean" },
    save_recordings: { type: "boolean" },
    notification_event: { type: "boolean" },
    notification_detect: { type: "boolean" },
    telemetry_consent: { type: "boolean" },
    ai_language: { type: "string" },
    spoken_languages: { type: "string" },
    jargons: { type: "string" },
    current_llm_provider: { type: "string" },
    current_llm_model: { type: "string" },
    current_stt_provider: { type: "string" },
    current_stt_model: { type: "string" },
  } as const satisfies InferTinyBaseSchema<typeof generalSchema>,
  table: {
    ai_providers: {
      type: { type: "string" },
      base_url: { type: "string" },
      api_key: { type: "string" },
    } as const satisfies InferTinyBaseSchema<typeof aiProviderSchema>,
    changes: {
      row_id: { type: "string" },
      table: { type: "string" },
      updated: { type: "boolean" },
      deleted: { type: "boolean" },
    },
    electric: {
      offset: { type: "string" },
      handle: { type: "string" },
      table: { type: "string" },
    },
  } as const satisfies TablesSchema,
};

const {
  useCreateMergeableStore,
  useCreatePersister,
  useCreateSynchronizer,
  useCreateQueries,
  useProvideStore,
  useProvidePersister,
  useProvideQueries,
  useProvideSynchronizer,
} = _UI as _UI.WithSchemas<Schemas>;

export const UI = _UI as _UI.WithSchemas<Schemas>;
export type Store = MergeableStore<Schemas>;
export type Schemas = [typeof SCHEMA.table, typeof SCHEMA.value];

export const createStore = () => {
  const store = createMergeableStore()
    .setTablesSchema(SCHEMA.table)
    .setValuesSchema(SCHEMA.value);

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
        undefined,
        undefined,
      ).startSync(),
  );

  const localPersister = useCreatePersister(
    store,
    (store) =>
      createLocalPersister<Schemas>(store as Store, {
        storeTableName: STORE_ID,
        storeIdColumnName: "id",
        autoLoadIntervalSeconds: 9999,
      }),
    [],
    (persister) => persister.startAutoPersisting(),
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
  useProvidePersister(STORE_ID, localPersister);
  useProvideQueries(STORE_ID, queries);
  useProvideSynchronizer(STORE_ID, synchronizer);

  return store;
};

export const rowIdOfChange = (table: string, row: string) => `${table}:${row}`;

export const QUERIES = {
  llmProviders: "llmProviders",
  sttProviders: "sttProviders",
};
