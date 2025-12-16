import { BaseDirectory, exists, readTextFile, remove } from "@tauri-apps/plugin-fs";
import { createCustomPersister } from "tinybase/persisters/with-schemas";
import type { Content, MergeableStore, OptionalSchemas } from "tinybase/with-schemas";

import { commands } from "@hypr/plugin-settings";

import { SETTINGS_MAPPING } from "./settings";
import { StoreOrMergeableStore } from "./shared";

type ProviderData = { base_url: string; api_key: string };
type ProviderRow = { type: "llm" | "stt"; base_url: string; api_key: string };

function getByPath(obj: unknown, path: readonly [string, string]): unknown {
  const section = (obj as Record<string, unknown>)?.[path[0]];
  return (section as Record<string, unknown>)?.[path[1]];
}

function setByPath(
  obj: Record<string, Record<string, unknown>>,
  path: readonly [string, string],
  value: unknown,
): void {
  obj[path[0]] ??= {};
  obj[path[0]][path[1]] = value;
}

function settingsToStoreValues(settings: unknown): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const [key, config] of Object.entries(SETTINGS_MAPPING.values)) {
    const value = getByPath(settings, config.path);
    if (value !== undefined) {
      values[key] = value;
    }
  }
  return values;
}

function settingsToProviderRows(settings: unknown): Record<string, ProviderRow> {
  const rows: Record<string, ProviderRow> = {};
  const ai = (settings as Record<string, unknown>)?.ai as Record<string, unknown> | undefined;

  for (const providerType of ["llm", "stt"] as const) {
    const providers = (ai?.[providerType] ?? {}) as Record<string, ProviderData>;
    for (const [id, data] of Object.entries(providers)) {
      if (data) {
        rows[id] = {
          type: providerType,
          base_url: data.base_url ?? "",
          api_key: data.api_key ?? "",
        };
      }
    }
  }
  return rows;
}

export function storeValuesToSettings(values: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, Record<string, unknown>> = {
    ai: { llm: {}, stt: {} },
    notification: {},
    general: {},
  };

  for (const [key, config] of Object.entries(SETTINGS_MAPPING.values)) {
    const value = values[key];
    if (value !== undefined) {
      setByPath(result, config.path, value);
    }
  }

  return result;
}

function providerRowsToSettings(rows: Record<string, ProviderRow>): {
  llm: Record<string, ProviderData>;
  stt: Record<string, ProviderData>;
} {
  const result = {
    llm: {} as Record<string, ProviderData>,
    stt: {} as Record<string, ProviderData>,
  };

  for (const [rowId, row] of Object.entries(rows)) {
    const { type, base_url, api_key } = row;
    if (type === "llm" || type === "stt") {
      result[type][rowId] = { base_url, api_key };
    }
  }

  return result;
}

export function settingsToContent<Schemas extends OptionalSchemas>(
  data: unknown,
): Content<Schemas> {
  const aiProviders = settingsToProviderRows(data);
  const values = settingsToStoreValues(data);
  return [{ ai_providers: aiProviders }, values] as unknown as Content<Schemas>;
}

export function storeToSettings<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
): Record<string, unknown> {
  const rows = (store.getTable("ai_providers") ?? {}) as unknown as Record<string, ProviderRow>;
  const providers = providerRowsToSettings(rows);

  const storeValues = store.getValues() as unknown as Record<string, unknown>;
  const settings = storeValuesToSettings(storeValues);

  (settings as Record<string, Record<string, unknown>>).ai = {
    ...(settings.ai as Record<string, unknown>),
    ...providers,
  };

  return settings;
}

export async function migrateKeysJsonToSettings(): Promise<boolean> {
  const keysPath = "hyprnote/keys.json";
  const options = { baseDir: BaseDirectory.Data };

  try {
    let fileExists: boolean;
    try {
      fileExists = await exists(keysPath, options);
    } catch {
      return false;
    }

    if (!fileExists) {
      return false;
    }

    const content = await readTextFile(keysPath, options);
    const legacy = JSON.parse(content) as {
      llm?: Record<string, ProviderData>;
      stt?: Record<string, ProviderData>;
    };

    const settings = {
      ai: {
        llm: legacy.llm ?? {},
        stt: legacy.stt ?? {},
      },
    };

    const result = await commands.save(settings);
    if (result.status === "error") {
      console.error("[migrateKeysJsonToSettings] save error:", result.error);
      return false;
    }

    await remove(keysPath, options);
    console.info("[migrateKeysJsonToSettings] migrated keys.json to settings.json");
    return true;
  } catch (error) {
    const errorStr = String(error);
    if (errorStr.includes("No such file or directory") || errorStr.includes("ENOENT")) {
      return false;
    }
    console.error("[migrateKeysJsonToSettings] error:", error);
    return false;
  }
}

export function createSettingsPersister<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
) {
  return createCustomPersister(
    store,
    async (): Promise<Content<Schemas> | undefined> => {
      const result = await commands.load();
      if (result.status === "error") {
        console.error("[SettingsPersister] load error:", result.error);
        return undefined;
      }
      return settingsToContent<Schemas>(result.data);
    },
    async () => {
      const settings = storeToSettings(store);
      const result = await commands.save(settings as Parameters<typeof commands.save>[0]);
      if (result.status === "error") {
        console.error("[SettingsPersister] save error:", result.error);
      }
    },
    (listener) => setInterval(listener, 1000),
    (handle) => clearInterval(handle),
    (error) => console.error("[SettingsPersister]:", error),
    StoreOrMergeableStore,
  );
}
