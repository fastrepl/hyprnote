import { Effect, pipe } from "effect";
import { Ollama } from "ollama/browser";

import { DEFAULT_RESULT, type ListModelsResult, REQUEST_TIMEOUT } from "./list-common";

export async function listOllamaModels(baseUrl: string, _apiKey: string): Promise<ListModelsResult> {
  if (!baseUrl) {
    return DEFAULT_RESULT;
  }

  return pipe(
    createOllamaClient(baseUrl),
    Effect.flatMap((ollama) =>
      pipe(
        fetchOllamaInventory(ollama),
        Effect.flatMap(({ models, runningModelNames }) =>
          pipe(
            fetchOllamaDetails(ollama, models, runningModelNames),
            Effect.map(summarizeOllamaDetails),
          )
        ),
      )
    ),
    Effect.timeout(REQUEST_TIMEOUT),
    Effect.catchAll(() => Effect.succeed(DEFAULT_RESULT)),
    Effect.runPromise,
  );
}

const createOllamaClient = (baseUrl: string) =>
  Effect.sync(() => new Ollama({ host: baseUrl.replace(/\/v1\/?$/, "") }));

const fetchOllamaInventory = (ollama: Ollama) =>
  pipe(
    Effect.all([
      Effect.tryPromise(() => ollama.list()),
      Effect.tryPromise(() => ollama.ps()).pipe(
        Effect.catchAll(() => Effect.succeed({ models: [] as Array<{ name: string }> })),
      ),
    ], { concurrency: "unbounded" }),
    Effect.map(([listResponse, psResponse]) => ({
      models: listResponse.models,
      runningModelNames: new Set<string>(psResponse.models?.map((model) => model.name) ?? []),
    })),
  );

const fetchOllamaDetails = (
  ollama: Ollama,
  models: Array<{ name: string }>,
  runningModelNames: Set<string>,
) =>
  Effect.all(
    models.map((model) =>
      Effect.tryPromise(() => ollama.show({ model: model.name })).pipe(
        Effect.map((info) => ({
          name: model.name,
          capabilities: info.capabilities ?? [],
          isRunning: runningModelNames.has(model.name),
        })),
        Effect.catchAll(() =>
          Effect.succeed({
            name: model.name,
            capabilities: [] as string[],
            isRunning: runningModelNames.has(model.name),
          })
        ),
      )
    ),
    { concurrency: "unbounded" },
  );

const summarizeOllamaDetails = (
  details: Array<{ name: string; capabilities: string[]; isRunning: boolean }>,
): ListModelsResult => {
  const supported: Array<{ name: string; isRunning: boolean }> = [];
  const ignored: string[] = [];

  for (const detail of details) {
    const hasCompletion = detail.capabilities.includes("completion");
    const hasTools = detail.capabilities.includes("tools");

    if (hasCompletion && hasTools) {
      supported.push({ name: detail.name, isRunning: detail.isRunning });
    } else {
      ignored.push(detail.name);
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
  };
};
