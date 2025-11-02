import { Data, HashMap, Option } from "effect";

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

export type SegmentKey = Data.TaggedEnum<{
  Channel: { channel: number };
}>;

export const SegmentKey = Data.taggedEnum<SegmentKey>();

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
  ].sort((a, b) => a.start_ms - b.start_ms);

  return createSpeakerTurns(allWords);
}

function createSpeakerTurns<TWord extends SegmentWord>(words: TWord[]): Segment<TWord>[] {
  const MAX_GAP_MS = 2000;

  if (words.length === 0) {
    return [];
  }

  const segments: Segment<TWord>[] = [];
  let currentActiveSegment = HashMap.empty<SegmentKey, Segment<TWord>>();

  for (const word of words) {
    const key = SegmentKey.Channel({ channel: word.channel });
    const currentOption = HashMap.get(currentActiveSegment, key);

    if (Option.isNone(currentOption)) {
      const newSegment = { key, words: [word] };
      currentActiveSegment = HashMap.set(currentActiveSegment, key, newSegment);
      segments.push(newSegment);
      continue;
    }

    const current = currentOption.value;
    const lastWord = current.words[current.words.length - 1];
    const gap = word.start_ms - lastWord.end_ms;

    if (gap <= MAX_GAP_MS) {
      current.words.push(word);
    } else {
      const newSegment = { key, words: [word] };
      currentActiveSegment = HashMap.set(currentActiveSegment, key, newSegment);
      segments.push(newSegment);
    }
  }

  return segments;
}
