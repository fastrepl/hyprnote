import type { SegmentPass, SegmentWord, WordLike } from "./shared";

export function normalizeWords<
  TFinal extends WordLike,
  TPartial extends WordLike,
>(
  finalWords: readonly TFinal[],
  partialWords: readonly TPartial[],
): SegmentWord[] {
  const finalNormalized = finalWords.map((word) => ({
    text: word.text,
    start_ms: word.start_ms,
    end_ms: word.end_ms,
    channel: word.channel,
    isFinal: true,
    ...("id" in word && word.id ? { id: word.id as string } : {}),
  }));

  const partialNormalized = partialWords.map((word) => ({
    text: word.text,
    start_ms: word.start_ms,
    end_ms: word.end_ms,
    channel: word.channel,
    isFinal: false,
    ...("id" in word && word.id ? { id: word.id as string } : {}),
  }));

  return [...finalNormalized, ...partialNormalized].sort(
    (a, b) => a.start_ms - b.start_ms,
  );
}

export const normalizeWordsPass: SegmentPass = {
  id: "normalize_words",
  run(graph) {
    const normalized = normalizeWords(
      graph.finalWords ?? [],
      graph.partialWords ?? [],
    ).map((word, order) => ({ ...word, order }));

    return { ...graph, words: normalized };
  },
};
