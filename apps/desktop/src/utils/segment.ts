export type WordLike = {
  text: string;
  start_ms: number;
  end_ms: number;
  channel: number;
};

export type PartialWord = WordLike;

export type SegmentWord = WordLike & { isFinal: boolean };

export type Segment<TWord extends SegmentWord = SegmentWord> = {
  key: SegmentKey;
  words: TWord[];
};

type SegmentKey = { channel: number } | { speaker_index: number; channel: number };

export function buildSegments<
  TFinal extends WordLike,
  TPartial extends WordLike,
>(
  finalWords: readonly TFinal[],
  partialWords: readonly TPartial[],
): Segment[] {
  const allWords: SegmentWord[] = [
    ...finalWords.map((word) => ({
      text: word.text,
      start_ms: word.start_ms,
      end_ms: word.end_ms,
      channel: word.channel,
      isFinal: true,
    })),
    ...partialWords.map((word) => ({
      text: word.text,
      start_ms: word.start_ms,
      end_ms: word.end_ms,
      channel: word.channel,
      isFinal: false,
    })),
  ];

  return createSpeakerTurns(allWords);
}

function createSpeakerTurns<TWord extends SegmentWord>(
  words: TWord[],
  maxGapMs = 2000,
): Segment<TWord>[] {
  if (words.length === 0) {
    return [];
  }

  const sortedWords = [...words].sort((a, b) => a.start_ms - b.start_ms);
  const segments: Segment<TWord>[] = [];
  const currentByChannel = new Map<number, Segment<TWord>>();

  for (const word of sortedWords) {
    const current = currentByChannel.get(word.channel);

    if (!current) {
      const newSegment = { key: { channel: word.channel }, words: [word] };
      currentByChannel.set(word.channel, newSegment);
      segments.push(newSegment);
      continue;
    }

    const lastWord = current.words[current.words.length - 1];
    const gap = word.start_ms - lastWord.end_ms;

    if (gap <= maxGapMs) {
      current.words.push(word);
    } else {
      const newSegment = { key: { channel: word.channel }, words: [word] };
      currentByChannel.set(word.channel, newSegment);
      segments.push(newSegment);
    }
  }

  return segments;
}
