import { Effect } from "effect";

export type ListModelsResult = { models: string[]; ignored: string[] };

export const DEFAULT_RESULT: ListModelsResult = { models: [], ignored: [] };
export const REQUEST_TIMEOUT = "5 seconds";

export const commonIgnoreKeywords = ["embed", "tts", "whisper", "dall-e", "audio", "image"] as const;

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

export const partition = <T>(
  items: readonly T[],
  predicate: (item: T) => boolean,
  extract: (item: T) => string,
): ListModelsResult => {
  const result = { models: [] as string[], ignored: [] as string[] };
  for (const item of items) {
    if (predicate(item)) {
      result.models.push(extract(item));
    } else {
      result.ignored.push(extract(item));
    }
  }
  return result;
};
