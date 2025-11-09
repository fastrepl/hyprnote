import { Effect, pipe, Schema } from "effect";

import {
  DEFAULT_RESULT,
  fetchJson,
  type ListModelsResult,
  partition,
  REQUEST_TIMEOUT,
  shouldIgnoreCommonKeywords,
} from "./list-common";

const OpenRouterModelSchema = Schema.Struct({
  data: Schema.Array(Schema.Struct({
    id: Schema.String,
    supported_parameters: Schema.optional(Schema.Array(Schema.String)),
    architecture: Schema.optional(Schema.Struct({
      input_modalities: Schema.optional(Schema.Array(Schema.String)),
      output_modalities: Schema.optional(Schema.Array(Schema.String)),
    })),
  })),
});

type OpenRouterModel = Schema.Schema.Type<typeof OpenRouterModelSchema>["data"][number];

export async function listOpenRouterModels(baseUrl: string, apiKey: string): Promise<ListModelsResult> {
  if (!baseUrl) {
    return DEFAULT_RESULT;
  }

  const hasCommonIgnoreKeywords = (model: OpenRouterModel): boolean => shouldIgnoreCommonKeywords(model.id);

  const supportsTextInput = (model: OpenRouterModel): boolean =>
    !Array.isArray(model.architecture?.input_modalities)
    || model.architecture.input_modalities.includes("text");

  const supportsToolUse = (model: OpenRouterModel): boolean =>
    !model.supported_parameters
    || ["tools", "tool_choice"].every((parameter) => model.supported_parameters?.includes(parameter));

  const shouldIncludeModel = (model: OpenRouterModel): boolean =>
    !hasCommonIgnoreKeywords(model)
    && supportsTextInput(model)
    && supportsToolUse(model);

  return pipe(
    fetchJson(`${baseUrl}/models`, { "Authorization": `Bearer ${apiKey}` }),
    Effect.andThen((json) => Schema.decodeUnknown(OpenRouterModelSchema)(json)),
    Effect.map(({ data }) => partition(data, shouldIncludeModel, (model) => model.id)),
    Effect.timeout(REQUEST_TIMEOUT),
    Effect.catchAll(() => Effect.succeed(DEFAULT_RESULT)),
    Effect.runPromise,
  );
}
