import type { Content } from "tinybase/with-schemas";

import type { Credentials } from "@hypr/store";

import type { Schemas, Store } from "../../store/settings";
import { SETTINGS_MAPPING } from "../../store/settings";

type LegacyProviderData = {
  base_url?: string;
  api_key?: string;
  access_key_id?: string;
  secret_access_key?: string;
  region?: string;
};
type ProviderRow = { type: "llm" | "stt"; credentials: string };

const JSON_ARRAY_FIELDS = new Set([
  "spoken_languages",
  "ignored_platforms",
  "ignored_recurring_series",
]);

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

function toStoreValue(key: string, value: unknown): unknown {
  if (!JSON_ARRAY_FIELDS.has(key)) {
    return value;
  }
  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return value;
      }
    } catch {}
  }
  return value;
}

function fromStoreValue(key: string, value: unknown): unknown {
  if (!JSON_ARRAY_FIELDS.has(key)) {
    return value;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {}

    if (value.includes(",")) {
      return value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return value;
}

function settingsToStoreValues(settings: unknown): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const [key, config] of Object.entries(SETTINGS_MAPPING.values)) {
    let value = getByPath(settings, config.path);

    if (value === undefined) {
      if (key === "ai_language") {
        value = getByPath(settings, ["general", "ai_language"]);
      } else if (key === "spoken_languages") {
        value = getByPath(settings, ["general", "spoken_languages"]);
      }
    }

    if (value !== undefined) {
      values[key] = toStoreValue(key, value);
    }
  }
  return values;
}

function toCredentialsJson(data: LegacyProviderData): string | null {
  if (data.access_key_id && data.secret_access_key && data.region) {
    return JSON.stringify({
      type: "aws",
      access_key_id: data.access_key_id,
      secret_access_key: data.secret_access_key,
      region: data.region,
    });
  }
  if (!data.api_key) {
    return null;
  }
  return JSON.stringify({
    type: "api_key",
    base_url: data.base_url || undefined,
    api_key: data.api_key,
  });
}

function settingsToProviderRows(
  settings: unknown,
): Record<string, ProviderRow> {
  const rows: Record<string, ProviderRow> = {};
  const ai = (settings as Record<string, unknown>)?.ai as
    | Record<string, unknown>
    | undefined;

  for (const providerType of ["llm", "stt"] as const) {
    const providers = (ai?.[providerType] ?? {}) as Record<
      string,
      LegacyProviderData
    >;
    for (const [id, data] of Object.entries(providers)) {
      if (data) {
        const credentials = toCredentialsJson(data);
        if (credentials) {
          rows[id] = {
            type: providerType,
            credentials,
          };
        }
      }
    }
  }
  return rows;
}

export function storeValuesToSettings(
  values: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, Record<string, unknown>> = {
    ai: { llm: {}, stt: {} },
    notification: {},
    general: {},
    language: {},
  };

  for (const [key, config] of Object.entries(SETTINGS_MAPPING.values)) {
    const value = values[key];
    if (value !== undefined) {
      setByPath(result, config.path, fromStoreValue(key, value));
    }
  }

  return result;
}

function credentialsToSettingsFormat(
  credentialsJson: string,
): Record<string, string> {
  try {
    const creds = JSON.parse(credentialsJson) as Credentials;
    if (creds.type === "aws") {
      return {
        access_key_id: creds.access_key_id,
        secret_access_key: creds.secret_access_key,
        region: creds.region,
      };
    }
    const result: Record<string, string> = {};
    if (creds.api_key) result.api_key = creds.api_key;
    if (creds.base_url) result.base_url = creds.base_url;
    return result;
  } catch {
    return {};
  }
}

function providerRowsToSettings(rows: Record<string, ProviderRow>): {
  llm: Record<string, Record<string, string>>;
  stt: Record<string, Record<string, string>>;
} {
  const result = {
    llm: {} as Record<string, Record<string, string>>,
    stt: {} as Record<string, Record<string, string>>,
  };

  for (const [rowId, row] of Object.entries(rows)) {
    const { type, credentials } = row;
    if (type === "llm" || type === "stt") {
      result[type][rowId] = credentialsToSettingsFormat(credentials);
    }
  }

  return result;
}

export function settingsToContent(data: unknown): Content<Schemas> {
  const aiProviders = settingsToProviderRows(data);
  const values = settingsToStoreValues(data);
  return [{ ai_providers: aiProviders }, values] as Content<Schemas>;
}

export function storeToSettings(store: Store): Record<string, unknown> {
  const rows = store.getTable("ai_providers") ?? {};
  const providers = providerRowsToSettings(rows as Record<string, ProviderRow>);

  const storeValues = store.getValues();
  const settings = storeValuesToSettings(
    storeValues as Record<string, unknown>,
  );

  (settings as Record<string, Record<string, unknown>>).ai = {
    ...(settings.ai as Record<string, unknown>),
    ...providers,
  };

  return settings;
}
