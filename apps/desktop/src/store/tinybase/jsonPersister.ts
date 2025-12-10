import {
  BaseDirectory,
  exists,
  readTextFile,
  writeTextFile,
} from "@tauri-apps/plugin-fs";
import { createCustomPersister } from "tinybase/persisters/with-schemas";
import type {
  Content,
  MergeableStore,
  OptionalSchemas,
} from "tinybase/with-schemas";

import { StoreOrMergeableStore } from "./shared";

type ProviderType = "llm" | "stt";
type ProviderData = { base_url: string; api_key: string };
export type SimplifiedFormat = Record<
  ProviderType,
  Record<string, ProviderData>
>;

export function toSimplifiedFormat<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
): SimplifiedFormat {
  const result: SimplifiedFormat = { llm: {}, stt: {} };
  const rows = store.getTable("ai_providers") ?? {};

  for (const [rowId, row] of Object.entries(rows)) {
    const { type, base_url, api_key } = row as unknown as {
      type: ProviderType;
      base_url: string;
      api_key: string;
    };
    if (type === "llm" || type === "stt") {
      result[type][rowId] = { base_url, api_key };
    }
  }

  return result;
}

export function fromSimplifiedFormat<Schemas extends OptionalSchemas>(
  data: SimplifiedFormat,
): Content<Schemas> {
  const aiProviders: Record<
    string,
    { type: string; base_url: string; api_key: string }
  > = {};

  for (const providerType of ["llm", "stt"] as const) {
    const providers = data[providerType] ?? {};
    for (const [providerId, providerData] of Object.entries(providers)) {
      aiProviders[providerId] = {
        type: providerType,
        base_url: providerData.base_url ?? "",
        api_key: providerData.api_key ?? "",
      };
    }
  }

  return [{ ai_providers: aiProviders }, {}] as unknown as Content<Schemas>;
}

export function createJsonPersister<Schemas extends OptionalSchemas>(
  store: MergeableStore<Schemas>,
  filename: string,
) {
  const path = `hyprnote/${filename}`;
  const options = { baseDir: BaseDirectory.Data };

  return createCustomPersister(
    store,
    async (): Promise<Content<Schemas> | undefined> => {
      if (!(await exists(path, options))) {
        return undefined;
      }
      const content = await readTextFile(path, options);
      return fromSimplifiedFormat<Schemas>(JSON.parse(content));
    },
    async () => {
      const data = toSimplifiedFormat(store);
      await writeTextFile(path, JSON.stringify(data, null, 2), options);
    },
    (listener) => setInterval(listener, 1000),
    (handle) => clearInterval(handle),
    (error) => console.error(`[JsonPersister] ${filename}:`, error),
    StoreOrMergeableStore,
  );
}
