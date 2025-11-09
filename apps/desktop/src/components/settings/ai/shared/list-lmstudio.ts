import { type LLM, LMStudioClient, type ModelInfo } from "@lmstudio/sdk";
import { Effect, pipe } from "effect";

import { DEFAULT_RESULT, type ListModelsResult, partition, REQUEST_TIMEOUT } from "./list-common";

export async function listLMStudioModels(baseUrl: string, _apiKey: string): Promise<ListModelsResult> {
  if (!baseUrl) {
    return DEFAULT_RESULT;
  }

  return pipe(
    createLMStudioClient(baseUrl),
    Effect.flatMap((client) =>
      pipe(
        fetchLMStudioInventory(client),
        Effect.map(({ downloadedModels, loadedLLMs }) => processLMStudioModels(downloadedModels, loadedLLMs)),
      )
    ),
    Effect.timeout(REQUEST_TIMEOUT),
    Effect.catchAll(() => Effect.succeed(DEFAULT_RESULT)),
    Effect.runPromise,
  );
}

const createLMStudioClient = (baseUrl: string) =>
  Effect.sync(() => {
    const url = new URL(baseUrl);
    const port = url.port || "1234";
    const formattedUrl = `ws:127.0.0.1:${port}`;
    return new LMStudioClient({ baseUrl: formattedUrl });
  });

const fetchLMStudioInventory = (client: LMStudioClient) =>
  pipe(
    Effect.all([
      Effect.tryPromise(() => client.system.listDownloadedModels()),
      Effect.tryPromise(() => client.llm.listLoaded()).pipe(
        Effect.catchAll(() => Effect.succeed([] as Array<LLM>)),
      ),
    ], { concurrency: "unbounded" }),
    Effect.flatMap(([downloadedModels, _loadedLLMs]) =>
      pipe(
        Effect.all(
          _loadedLLMs.map((llm) =>
            Effect.tryPromise(async () => ({
              modelKey: llm.modelKey,
              context: await llm.getContextLength(),
            }))
          ),
          { concurrency: "unbounded" },
        ),
        Effect.map((loadedLLMs) => ({ downloadedModels, loadedLLMs })),
      )
    ),
  );

const processLMStudioModels = (
  downloadedModels: Array<ModelInfo>,
  loadedLLMs: Array<{ modelKey: string; context: number }>,
): ListModelsResult => {
  const result = partition(
    downloadedModels,
    (model) =>
      model.type === "llm"
      && model.trainedForToolUse
      && model.maxContextLength > 15 * 1000,
    (model) => model.path,
  );

  const loadedLLMsSet = new Set(loadedLLMs.map((m) => m.modelKey));

  result.models.sort((a, b) => {
    const aLoaded = loadedLLMsSet.has(a);
    const bLoaded = loadedLLMsSet.has(b);
    if (aLoaded === bLoaded) {
      return 0;
    }
    return aLoaded ? -1 : 1;
  });

  return result;
};
