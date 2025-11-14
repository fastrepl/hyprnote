import { Effect } from "effect";

export type ModelIgnoreReason =
  | "common_keyword"
  | "no_tool"
  | "no_text_input"
  | "no_completion"
  | "not_llm"
  | "context_too_small";

export type IgnoredModel = { id: string; reasons: ModelIgnoreReason[] };

export type ListModelsResult = {
  models: string[];
  ignored: IgnoredModel[];
};

export const DEFAULT_RESULT: ListModelsResult = { models: [], ignored: [] };
export const REQUEST_TIMEOUT = "5 seconds";

export const commonIgnoreKeywords = [
  "embed",
  "sora",
  "tts",
  "whisper",
  "dall-e",
  "audio",
  "image",
] as const;

export const fetchJson = (url: string, headers: Record<string, string>) =>
  Effect.tryPromise({
    try: () =>
      fetch(url, { headers }).then((r) => {
        if (!r.ok) {
          throw new Error(`HTTP ${r.status}`);
        }
        return r.json();
      }),
    catch: () => new Error("Fetch failed"),
  });

export const shouldIgnoreCommonKeywords = (id: string): boolean => {
  const lowerId = id.toLowerCase();
  return commonIgnoreKeywords.some((keyword) => lowerId.includes(keyword));
};

export const partition = <T,>(
  items: readonly T[],
  shouldIgnore: (item: T) => ModelIgnoreReason[] | null,
  extract: (item: T) => string,
): ListModelsResult => {
  const result = { models: [] as string[], ignored: [] as IgnoredModel[] };
  for (const item of items) {
    const reasons = shouldIgnore(item);

    if (!reasons || reasons.length === 0) {
      result.models.push(extract(item));
    } else {
      result.ignored.push({ id: extract(item), reasons });
    }
  }
  return result;
};
