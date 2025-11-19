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

const AnthropicModelSchema = Schema.Struct({
  data: Schema.Array(
    Schema.Struct({
      type: Schema.String,
      id: Schema.String,
      display_name: Schema.String,
      created_at: Schema.String,
    }),
  ),
  has_more: Schema.Boolean,
  first_id: Schema.String,
  last_id: Schema.String,
});

export async function listAnthropicModels(
  baseUrl: string,
  apiKey: string,
): Promise<ListModelsResult> {
  if (!baseUrl) {
    return DEFAULT_RESULT;
  }

  return pipe(
    fetchJson(`${baseUrl}/models`, {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    }),
    Effect.andThen((json) => Schema.decodeUnknown(AnthropicModelSchema)(json)),
    Effect.map(({ data }) =>
      partition(
        data,
        (model) => {
          const reasons: ModelIgnoreReason[] = [];
          if (shouldIgnoreCommonKeywords(model.id)) {
            reasons.push("common_keyword");
          }
          return reasons.length > 0 ? reasons : null;
        },
        (model) => model.id,
      ),
    ),
    Effect.timeout(REQUEST_TIMEOUT),
    Effect.catchAll(() => Effect.succeed(DEFAULT_RESULT)),
    Effect.runPromise,
  );
}
