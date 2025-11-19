import { Effect, pipe, Schema } from "effect";

import {
  DEFAULT_RESULT,
  fetchJson,
  type ListModelsResult,
  type ModelIgnoreReason,
  partition,
  REQUEST_TIMEOUT,
  shouldIgnoreCommonKeywords,
} from "./list-common";

const GoogleModelSchema = Schema.Struct({
  models: Schema.Array(
    Schema.Struct({
      name: Schema.String,
      supportedGenerationMethods: Schema.optional(Schema.Array(Schema.String)),
    }),
  ),
});

type GoogleModel = Schema.Schema.Type<
  typeof GoogleModelSchema
>["models"][number];

export async function listGoogleModels(
  baseUrl: string,
  apiKey: string,
): Promise<ListModelsResult> {
  if (!baseUrl) {
    return DEFAULT_RESULT;
  }

  const supportsGeneration = (model: GoogleModel): boolean =>
    !model.supportedGenerationMethods ||
    model.supportedGenerationMethods.includes("generateContent");

  const getIgnoreReasons = (model: GoogleModel): ModelIgnoreReason[] | null => {
    const reasons: ModelIgnoreReason[] = [];
    if (shouldIgnoreCommonKeywords(model.name)) {
      reasons.push("common_keyword");
    }
    if (!supportsGeneration(model)) {
      reasons.push("no_completion");
    }
    return reasons.length > 0 ? reasons : null;
  };

  const extractModelId = (model: GoogleModel): string => {
    return model.name.replace(/^models\//, "");
  };

  return pipe(
    fetchJson(`${baseUrl}/models`, { "x-goog-api-key": apiKey }),
    Effect.andThen((json) => Schema.decodeUnknown(GoogleModelSchema)(json)),
    Effect.map(({ models }) =>
      partition(models, getIgnoreReasons, extractModelId),
    ),
    Effect.timeout(REQUEST_TIMEOUT),
    Effect.catchAll(() => Effect.succeed(DEFAULT_RESULT)),
    Effect.runPromise,
  );
}
