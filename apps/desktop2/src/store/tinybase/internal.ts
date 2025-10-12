import * as _UI from "tinybase/ui-react/with-schemas";
import { createMergeableStore, type MergeableStore, type TablesSchema } from "tinybase/with-schemas";
import { z } from "zod";

import { createLocalPersister } from "./localPersister";
import { createLocalSynchronizer } from "./localSynchronizer";
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
  current_llm_provider: z.string().default("hypr"),
  current_stt_provider: z.string().default("hypr"),
});

export const aiSchema = z.object({
  base_url: z.string(),
  api_key: z.string(),
});
export type AI = z.infer<typeof aiSchema>;
export type AIStorage = ToStorageType<typeof aiSchema>;

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
    current_stt_provider: { type: "string" },
  } as const satisfies InferTinyBaseSchema<typeof generalSchema>,
  table: {
    ai: {
      base_url: { type: "string" },
      api_key: { type: "string" },
    } as const satisfies InferTinyBaseSchema<typeof aiSchema>,
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
  useProvideStore,
  useProvidePersister,
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
  // TODO
  store.setValue("user_id", "4c2c0e44-f674-4c67-87d0-00bcfb78dc8a");

  useCreateSynchronizer(
    store,
    async (store) => createLocalSynchronizer(store),
    [],
    (sync) => sync.startSync(),
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

  useProvideStore(STORE_ID, store);
  useProvidePersister(STORE_ID, localPersister);

  return store;
};

export const rowIdOfChange = (table: string, row: string) => `${table}:${row}`;
