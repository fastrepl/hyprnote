import { Data, Equal, HashMap, Option } from "effect";

export type WordLike = {
  text: string;
  start_ms: number;
  end_ms: number;
  channel: number;
};

export type PartialWord = WordLike;

export type SegmentWord = WordLike & { isFinal: boolean };

export type SpeakerHint = {
  wordIndex: number;
  speakerIndex: number;
};

export type Segment<TWord extends SegmentWord = SegmentWord> = {
  key: SegmentKey;
  words: TWord[];
};

export type SegmentKey = Data.TaggedEnum<{
  Channel: { channel: number };
  ChannelSpeaker: { channel: number; speakerIndex: number };
}>;

export const SegmentKey = Data.taggedEnum<SegmentKey>();

export function buildSegments<
  TFinal extends WordLike,
  TPartial extends WordLike,
>(
  finalWords: readonly TFinal[],
  partialWords: readonly TPartial[],
  speakerHints: readonly SpeakerHint[] = [],
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

  return createSpeakerTurns(allWords, speakerHints);
}

function createSpeakerTurns<TWord extends SegmentWord>(
  words: TWord[],
  speakerHints: readonly SpeakerHint[],
): Segment<TWord>[] {
  const MAX_GAP_MS = 2000;

  if (words.length === 0) {
    return [];
  }

  const speakerByIndex = new Map<number, number>();
  speakerHints.forEach((hint) => {
    speakerByIndex.set(hint.wordIndex, hint.speakerIndex);
  });

  const segments: Segment<TWord>[] = [];
  let currentActiveSegment = HashMap.empty<SegmentKey, Segment<TWord>>();
  const lastSpeakerByChannel = new Map<number, number>();

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const explicitSpeaker = speakerByIndex.get(i);

    const speakerIndex = explicitSpeaker ?? (!word.isFinal ? lastSpeakerByChannel.get(word.channel) : undefined);

    if (typeof explicitSpeaker === "number") {
      lastSpeakerByChannel.set(word.channel, explicitSpeaker);
    }

    const key = typeof speakerIndex === "number"
      ? SegmentKey.ChannelSpeaker({ channel: word.channel, speakerIndex })
      : SegmentKey.Channel({ channel: word.channel });
    const currentOption = HashMap.get(currentActiveSegment, key);

    if (Option.isSome(currentOption) && key._tag === "ChannelSpeaker") {
      const lastSegment = segments[segments.length - 1];
      if (!lastSegment || !Equal.equals(lastSegment.key, key)) {
        const newSegment = { key, words: [word] };
        currentActiveSegment = HashMap.set(currentActiveSegment, key, newSegment);
        segments.push(newSegment);
        continue;
      }
    }

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
