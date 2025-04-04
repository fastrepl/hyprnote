export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const formatTime = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  }
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
};

/**
 * Parses dialogue text that may contain multiple speakers indicated by dash prefixes
 * @param text The raw dialogue text
 * @returns An array of dialogue segments
 */
export function parseDialogue(text: string) {
  if (!text.trim().startsWith("-")) {
    return [{ text }];
  }

  const segments = text
    .split(/(?=- )/)
    .filter(Boolean)
    .map(segment => ({
      text: segment.trim(),
    }));

  return segments.length ? segments : [{ text }];
}
