export function getWordHighlightState({
  audioExists,
  isPlaying,
  currentMs,
  wordStartMs,
  wordEndMs,
}: {
  audioExists: boolean;
  isPlaying: boolean;
  currentMs: number;
  wordStartMs: number;
  wordEndMs: number;
}): "current" | "buffer" | "none" {
  if (!audioExists || !isPlaying) {
    return "none";
  }

  const isCurrentWord = currentMs >= wordStartMs && currentMs <= wordEndMs;
  if (isCurrentWord) {
    return "current";
  }

  const buffer = 300;
  const distanceBefore = wordStartMs - currentMs;
  const distanceAfter = currentMs - wordEndMs;
  const isInBuffer =
    (distanceBefore <= buffer && distanceBefore > 0) ||
    (distanceAfter <= buffer && distanceAfter > 0);

  return isInBuffer ? "buffer" : "none";
}
