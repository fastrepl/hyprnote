import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { Effect, pipe, Schema } from "effect";

import {
  DEFAULT_RESULT,
  type IgnoredModel,
  type ListModelsResult,
  type ModelIgnoreReason,
  type ModelMetadata,
  REQUEST_TIMEOUT,
} from "./list-common";

const OllamaTagsSchema = Schema.Struct({
  models: Schema.Array(
    Schema.Struct({
      name: Schema.String,
    }),
  ),
});

const OllamaPsSchema = Schema.Struct({
  models: Schema.optionalWith(
    Schema.Array(
      Schema.Struct({
        name: Schema.String,
      }),
    ),
    { default: () => [] },
  ),
});

const OllamaShowSchema = Schema.Struct({
  capabilities: Schema.optionalWith(Schema.Array(Schema.String), {
    default: () => [],
  }),
});

const fetchOllamaJson = (url: string) =>
  Effect.tryPromise({
    try: async () => {
      const r = await tauriFetch(url, { method: "GET" });
      if (!r.ok) {
        const errorBody = await r.text();
        throw new Error(`HTTP ${r.status}: ${errorBody}`);
      }
      return r.json();
    },
    catch: (e) => e,
  });

const postOllamaJson = (url: string, body: object) =>
  Effect.tryPromise({
    try: async () => {
      const r = await tauriFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const errorBody = await r.text();
        throw new Error(`HTTP ${r.status}: ${errorBody}`);
      }
      return r.json();
    },
    catch: (e) => e,
  });

export async function listOllamaModels(
  baseUrl: string,
  _apiKey: string,
): Promise<ListModelsResult> {
  if (!baseUrl) {
    return DEFAULT_RESULT;
  }

  const ollamaBaseUrl = baseUrl.replace(/\/v1\/?$/, "");

  return pipe(
    fetchOllamaInventory(ollamaBaseUrl),
    Effect.flatMap(({ models, runningModelNames }) =>
      pipe(
        fetchOllamaDetails(ollamaBaseUrl, models, runningModelNames),
        Effect.map(summarizeOllamaDetails),
      ),
    ),
    Effect.timeout(REQUEST_TIMEOUT),
    Effect.catchAll(() => Effect.succeed(DEFAULT_RESULT)),
    Effect.runPromise,
  );
}

const fetchOllamaInventory = (ollamaBaseUrl: string) =>
  pipe(
    Effect.all(
      [
        pipe(
          fetchOllamaJson(`${ollamaBaseUrl}/api/tags`),
          Effect.andThen((json) =>
            Schema.decodeUnknown(OllamaTagsSchema)(json),
          ),
        ),
        pipe(
          fetchOllamaJson(`${ollamaBaseUrl}/api/ps`),
          Effect.andThen((json) => Schema.decodeUnknown(OllamaPsSchema)(json)),
          Effect.catchAll(() =>
            Effect.succeed({
              models: [] as Array<{ name: string }>,
            }),
          ),
        ),
      ],
      { concurrency: "unbounded" },
    ),
    Effect.map(([tagsResponse, psResponse]) => ({
      models: tagsResponse.models,
      runningModelNames: new Set<string>(
        psResponse.models.map((model) => model.name),
      ),
    })),
  );

const fetchOllamaDetails = (
  ollamaBaseUrl: string,
  models: Array<{ name: string }>,
  runningModelNames: Set<string>,
) =>
  Effect.all(
    models.map((model) =>
      pipe(
        postOllamaJson(`${ollamaBaseUrl}/api/show`, { model: model.name }),
        Effect.andThen((json) => Schema.decodeUnknown(OllamaShowSchema)(json)),
        Effect.map((info) => ({
          name: model.name,
          capabilities: info.capabilities,
          isRunning: runningModelNames.has(model.name),
        })),
        Effect.catchAll(() =>
          Effect.succeed({
            name: model.name,
            capabilities: [] as string[],
            isRunning: runningModelNames.has(model.name),
          }),
        ),
      ),
    ),
    { concurrency: "unbounded" },
  );

const summarizeOllamaDetails = (
  details: Array<{
    name: string;
    capabilities: string[];
    isRunning: boolean;
  }>,
): ListModelsResult => {
  const supported: Array<{ name: string; isRunning: boolean }> = [];
  const ignored: IgnoredModel[] = [];
  const metadata: Record<string, ModelMetadata> = {};

  for (const detail of details) {
    const hasCompletion = detail.capabilities.includes("completion");
    const hasTools = detail.capabilities.includes("tools");

    if (hasCompletion && hasTools) {
      supported.push({ name: detail.name, isRunning: detail.isRunning });
      // TODO: Seems like Ollama do not have way to know input modality.
      metadata[detail.name] = { input_modalities: ["text"] };
    } else {
      const reasons: ModelIgnoreReason[] = [];
      if (!hasCompletion) {
        reasons.push("no_completion");
      }
      if (!hasTools) {
        reasons.push("no_tool");
      }
      ignored.push({ id: detail.name, reasons });
    }
  }

  supported.sort((a, b) => {
    if (a.isRunning === b.isRunning) {
      return a.name.localeCompare(b.name);
    }
    return a.isRunning ? -1 : 1;
  });

  return {
    models: supported.map((detail) => detail.name),
    ignored,
    metadata,
  };
};
