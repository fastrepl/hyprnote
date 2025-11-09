import { Effect, pipe, Schema } from "effect";
import {
  DEFAULT_RESULT,
  fetchJson,
  type ListModelsResult,
  partition,
  REQUEST_TIMEOUT,
  shouldIgnoreCommonKeywords,
} from "./list-common";

const OpenAIModelSchema = Schema.Struct({
  data: Schema.Array(Schema.Struct({
    id: Schema.String,
  })),
});

export async function listOpenAIModels(baseUrl: string, apiKey: string): Promise<ListModelsResult> {
  if (!baseUrl) {
    return DEFAULT_RESULT;
  }

  return pipe(
    fetchJson(`${baseUrl}/models`, { "Authorization": `Bearer ${apiKey}` }),
    Effect.andThen((json) => Schema.decodeUnknown(OpenAIModelSchema)(json)),
    Effect.map(({ data }) => partition(data, (model) => !shouldIgnoreCommonKeywords(model.id), (model) => model.id)),
    Effect.timeout(REQUEST_TIMEOUT),
    Effect.catchAll(() => Effect.succeed(DEFAULT_RESULT)),
    Effect.runPromise,
  );
}

export async function listAnthropicModels(baseUrl: string, apiKey: string): Promise<ListModelsResult> {
  if (!baseUrl) {
    return DEFAULT_RESULT;
  }

  return pipe(
    fetchJson(`${baseUrl}/models`, { "Authorization": `Bearer ${apiKey}` }),
    Effect.andThen((json) => Schema.decodeUnknown(OpenAIModelSchema)(json)),
    Effect.map(({ data }) => partition(data, (model) => !shouldIgnoreCommonKeywords(model.id), (model) => model.id)),
    Effect.timeout(REQUEST_TIMEOUT),
    Effect.catchAll(() => Effect.succeed(DEFAULT_RESULT)),
    Effect.runPromise,
  );
}

export async function listGenericModels(baseUrl: string, apiKey: string): Promise<ListModelsResult> {
  if (!baseUrl) {
    return DEFAULT_RESULT;
  }

  return pipe(
    fetchJson(`${baseUrl}/models`, { "Authorization": `Bearer ${apiKey}` }),
    Effect.andThen((json) => Schema.decodeUnknown(OpenAIModelSchema)(json)),
    Effect.map(({ data }) => partition(data, (model) => !shouldIgnoreCommonKeywords(model.id), (model) => model.id)),
    Effect.timeout(REQUEST_TIMEOUT),
    Effect.catchAll(() => Effect.succeed(DEFAULT_RESULT)),
    Effect.runPromise,
  );
}
