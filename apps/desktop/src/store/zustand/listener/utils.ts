export function fixSpacingForWords(
  words: string[],
  transcript: string,
): string[] {
  const result: string[] = [];
  let pos = 0;

  for (const [i, word] of words.entries()) {
    const trimmed = word.trim();

    if (!trimmed) {
      result.push(word);
      continue;
    }

    const foundAt = transcript.indexOf(trimmed, pos);
    if (foundAt === -1) {
      result.push(word);
      continue;
    }

    const prefix = i === 0 ? " " : transcript.slice(pos, foundAt);
    result.push(prefix + trimmed);
    pos = foundAt + trimmed.length;
  }

  return result;
}
