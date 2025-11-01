export type WordLike = {
  text: string;
  start_ms: number;
  end_ms: number;
  channel: number;
};

export type PartialWord = WordLike;

export type SegmentWord = WordLike & { isFinal: boolean };

export type Segment<TWord extends SegmentWord = SegmentWord> = {
  channel: number;
  words: TWord[];
};

export function buildSegments<
  TFinal extends WordLike,
  TPartial extends WordLike,
  TWord extends SegmentWord = SegmentWord,
>(
  finalWords: readonly TFinal[],
  partialWords: readonly TPartial[],
  transform?: (word: SegmentWord) => TWord,
): Segment<TWord>[] {
  const mapWord = transform ?? ((word) => word as TWord);
  const wordsByChannel = groupWordsByChannel(finalWords, partialWords, mapWord);
  return createSpeakerTurns(wordsByChannel);
}

function toSegmentWord(word: WordLike, isFinal: boolean): SegmentWord {
  return {
    text: word.text,
    start_ms: word.start_ms,
    end_ms: word.end_ms,
    channel: word.channel,
    isFinal,
  };
}

function addWordToChannel<TWord extends SegmentWord>(
  channels: Map<number, TWord[]>,
  word: TWord,
): void {
  const channelWords = channels.get(word.channel) ?? [];
  channelWords.push(word);
  channels.set(word.channel, channelWords);
}

function groupWordsByChannel<
  TFinal extends WordLike,
  TPartial extends WordLike,
  TWord extends SegmentWord,
>(
  finalWords: readonly TFinal[],
  partialWords: readonly TPartial[],
  mapWord: (word: SegmentWord) => TWord,
): Map<number, TWord[]> {
  const channels = new Map<number, TWord[]>();

  for (const word of finalWords) {
    addWordToChannel(channels, mapWord(toSegmentWord(word, true)));
  }

  for (const word of partialWords) {
    addWordToChannel(channels, mapWord(toSegmentWord(word, false)));
  }

  for (const words of channels.values()) {
    words.sort((a, b) => a.start_ms - b.start_ms);
  }

  return channels;
}

function flattenAndSortWords<TWord extends SegmentWord>(
  wordsByChannel: Map<number, TWord[]>,
): TWord[] {
  const allWords: TWord[] = [];
  wordsByChannel.forEach((words) => allWords.push(...words));
  allWords.sort((a, b) => a.start_ms - b.start_ms);
  return allWords;
}

function splitIntoInitialTurns<TWord extends SegmentWord>(
  sortedWords: TWord[],
): Segment<TWord>[] {
  if (sortedWords.length === 0) {
    return [];
  }

  const turns: Segment<TWord>[] = [];
  let currentTurn: Segment<TWord> = {
    channel: sortedWords[0].channel,
    words: [sortedWords[0]],
  };

  for (let i = 1; i < sortedWords.length; i++) {
    const word = sortedWords[i];

    if (word.channel === currentTurn.channel) {
      currentTurn.words.push(word);
    } else {
      turns.push(currentTurn);
      currentTurn = { channel: word.channel, words: [word] };
    }
  }

  turns.push(currentTurn);
  return turns;
}

function groupSegmentsByChannel<TWord extends SegmentWord>(
  segments: Segment<TWord>[],
): Map<number, Segment<TWord>[]> {
  const byChannel = new Map<number, Segment<TWord>[]>();

  for (const segment of segments) {
    const channelSegments = byChannel.get(segment.channel) ?? [];
    channelSegments.push(segment);
    byChannel.set(segment.channel, channelSegments);
  }

  return byChannel;
}

function getSegmentStartTime<TWord extends SegmentWord>(
  segment: Segment<TWord>,
): number {
  return segment.words[0]?.start_ms ?? 0;
}

function calculateTimingGap<TWord extends SegmentWord>(
  firstSegment: Segment<TWord>,
  secondSegment: Segment<TWord>,
): number {
  if (firstSegment.words.length === 0 || secondSegment.words.length === 0) {
    return Infinity;
  }

  const lastWordOfFirst = firstSegment.words[firstSegment.words.length - 1];
  const firstWordOfSecond = secondSegment.words[0];
  return firstWordOfSecond.start_ms - lastWordOfFirst.end_ms;
}

function mergeSegmentsByGap<TWord extends SegmentWord>(
  segments: Segment<TWord>[],
  channel: number,
  maxGapMs: number,
): Segment<TWord>[] {
  segments.sort((a, b) => getSegmentStartTime(a) - getSegmentStartTime(b));

  const merged: Segment<TWord>[] = [];
  let currentMerged = { channel, words: [...segments[0].words] };

  for (let i = 1; i < segments.length; i++) {
    const nextSegment = segments[i];
    const gap = calculateTimingGap(currentMerged, nextSegment);

    if (gap < maxGapMs) {
      currentMerged.words.push(...nextSegment.words);
    } else {
      merged.push(currentMerged);
      currentMerged = { channel, words: [...nextSegment.words] };
    }
  }

  merged.push(currentMerged);
  return merged;
}

function createSpeakerTurns<TWord extends SegmentWord>(
  wordsByChannel: Map<number, TWord[]>,
  maxGapMs = 2000,
): Segment<TWord>[] {
  const sortedWords = flattenAndSortWords(wordsByChannel);
  if (sortedWords.length === 0) {
    return [];
  }

  const initialTurns = splitIntoInitialTurns(sortedWords);
  const turnsByChannel = groupSegmentsByChannel(initialTurns);

  const finalSegments: Segment<TWord>[] = [];
  for (const [channel, channelTurns] of turnsByChannel) {
    finalSegments.push(...mergeSegmentsByGap(channelTurns, channel, maxGapMs));
  }

  finalSegments.sort((a, b) => getSegmentStartTime(a) - getSegmentStartTime(b));
  return finalSegments;
}
