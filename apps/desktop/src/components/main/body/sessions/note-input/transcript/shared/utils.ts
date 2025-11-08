export function getWordHighlightState(
  {
    editable,
    audioExists,
    currentMs,
    wordStartMs,
    wordEndMs,
  }: {
    editable: boolean;
    audioExists: boolean;
    currentMs: number;
    wordStartMs: number;
    wordEndMs: number;
  },
): "current" | "buffer" | "none" {
  if (!editable || !audioExists) {
    return "none";
  }

  const isCurrentWord = currentMs >= wordStartMs && currentMs <= wordEndMs;
  if (isCurrentWord) {
    return "current";
  }

  const buffer = 300;
  const distanceBefore = wordStartMs - currentMs;
  const distanceAfter = currentMs - wordEndMs;
  const isInBuffer = (distanceBefore <= buffer && distanceBefore > 0)
    || (distanceAfter <= buffer && distanceAfter > 0);

  return isInBuffer ? "buffer" : "none";
}
