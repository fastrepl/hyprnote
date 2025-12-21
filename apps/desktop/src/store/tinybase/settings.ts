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

import {
  createSettingsPersister,
  migrateKeysJsonToSettings,
} from "./jsonPersister";
import * as main from "./main";
import { registerSaveHandler } from "./save";

export const STORE_ID = "settings";

export const SETTINGS_MAPPING = {
  values: {
    autostart: { type: "boolean", path: ["general", "autostart"] },
    save_recordings: {
      type: "boolean",
      path: ["general", "save_recordings"],
    },
    notification_event: {
      type: "boolean",
      path: ["notification", "event"],
    },
    notification_detect: {
      type: "boolean",
      path: ["notification", "detect"],
    },
    respect_dnd: { type: "boolean", path: ["notification", "respect_dnd"] },
    quit_intercept: {
      type: "boolean",
      path: ["general", "quit_intercept"],
    },
    telemetry_consent: {
      type: "boolean",
      path: ["general", "telemetry_consent"],
    },
    ai_language: { type: "string", path: ["general", "ai_language"] },
    spoken_languages: {
      type: "string",
      path: ["general", "spoken_languages"],
    },
    ignored_platforms: {
      type: "string",
      path: ["notification", "ignored_platforms"],
    },
    dismissed_banners: {
      type: "string",
      path: ["general", "dismissed_banners"],
    },
    current_llm_provider: {
      type: "string",
      path: ["ai", "current_llm_provider"],
    },
    current_llm_model: {
      type: "string",
      path: ["ai", "current_llm_model"],
    },
    current_stt_provider: {
      type: "string",
      path: ["ai", "current_stt_provider"],
    },
    current_stt_model: {
      type: "string",
      path: ["ai", "current_stt_model"],
    },
    auto_export: {
      type: "boolean",
      path: ["data", "auto_export"],
    },
    auto_export_summary: {
      type: "boolean",
      path: ["data", "auto_export_summary"],
    },
    auto_export_memo: {
      type: "boolean",
      path: ["data", "auto_export_memo"],
    },
    auto_export_transcript: {
      type: "boolean",
      path: ["data", "auto_export_transcript"],
    },
  },
  tables: {
    ai_providers: {
      schema: {
        type: { type: "string" },
        base_url: { type: "string" },
        api_key: { type: "string" },
      },
    },
  },
} as const;

type ValueType = "boolean" | "string" | "number";
type ValueMapping = { type: ValueType; path: readonly [string, string] };

type DeriveValuesSchema<T extends Record<string, ValueMapping>> = {
  [K in keyof T]: { type: T[K]["type"] };
};

const SCHEMA = {
  value: Object.fromEntries(
    Object.entries(SETTINGS_MAPPING.values).map(([key, config]) => [
      key,
      { type: config.type },
    ]),
  ) as DeriveValuesSchema<
    typeof SETTINGS_MAPPING.values
  > satisfies ValuesSchema,
  table: Object.fromEntries(
    Object.entries(SETTINGS_MAPPING.tables).map(([key, config]) => [
      key,
      config.schema,
    ]),
  ) as {
    ai_providers: typeof SETTINGS_MAPPING.tables.ai_providers.schema;
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
      if (persist) {
        await migrateKeysJsonToSettings();
      }

      const settingsPersister = createSettingsPersister<Schemas>(
        store as Store,
      );

      await settingsPersister.load();

      if (!persist) {
        return undefined;
      }

      if (mainStore) {
        migrateFromMainStore(mainStore as main.Store, store as Store);
        await settingsPersister.save();
      }

      await settingsPersister.startAutoPersisting();
      return settingsPersister;
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
    createBroadcastChannelSynchronizer(store, "hypr-sync-settings").startSync(),
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

export const SETTINGS_VALUE_KEYS = Object.keys(
  SETTINGS_MAPPING.values,
) as (keyof typeof SETTINGS_MAPPING.values)[];

function migrateFromMainStore(mainStore: main.Store, settingsStore: Store) {
  const mainProviders = mainStore.getTable("ai_providers");

  if (mainProviders && Object.keys(mainProviders).length > 0) {
    for (const [rowId, row] of Object.entries(mainProviders)) {
      if (row.api_key || row.base_url) {
        settingsStore.setRow("ai_providers", rowId, {
          type: row.type ?? "",
          base_url: row.base_url ?? "",
          api_key: row.api_key ?? "",
        });
      }
      mainStore.delRow("ai_providers", rowId);
    }
  }

  const mainValues = mainStore.getValues();
  for (const key of SETTINGS_VALUE_KEYS) {
    if (!(key in mainValues)) {
      continue;
    }
    const value = mainValues[key as keyof typeof mainValues];
    if (value !== undefined && !settingsStore.hasValue(key)) {
      settingsStore.setValue(key, value as any);
    }
    if (value !== undefined) {
      mainStore.delValue(key as keyof typeof mainValues);
    }
  }
}
