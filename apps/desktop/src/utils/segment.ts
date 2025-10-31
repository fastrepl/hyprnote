import type * as main from "../store/tinybase/main";

export type MaybePartialWord = Omit<
  main.Word & { isFinal: boolean },
  "transcript_id" | "user_id" | "created_at"
>;

export type PartialWord = {
  text: string;
  start_ms: number;
  end_ms: number;
  channel: number;
};

export type Segment = {
  channel: number;
  words: MaybePartialWord[];
};

export function mergeWordsByChannel(
  finalWords: main.Word[],
  partialWords: PartialWord[][],
): Map<number, MaybePartialWord[]> {
  const channels = new Map<number, MaybePartialWord[]>();

  finalWords.forEach((word) => {
    const channelWords = channels.get(word.channel) ?? [];
    channelWords.push({
      text: word.text,
      start_ms: word.start_ms,
      end_ms: word.end_ms,
      channel: word.channel,
      isFinal: true,
    });
    channels.set(word.channel, channelWords);
  });

  partialWords.forEach((words) => {
    words.forEach((word) => {
      const channelWords = channels.get(word.channel) ?? [];
      channelWords.push({
        text: word.text,
        start_ms: word.start_ms,
        end_ms: word.end_ms,
        channel: word.channel,
        isFinal: false,
      });
      channels.set(word.channel, channelWords);
    });
  });

  channels.forEach((words, channel) => {
    channels.set(
      channel,
      words.sort((a, b) => a.start_ms - b.start_ms),
    );
  });

  return channels;
}

export function splitIntoSegments(
  words: MaybePartialWord[],
  options: SplitOptions = {},
): MaybePartialWord[][] {
  const { maxWordsPerSegment = 30, minGapMs = 2000 } = options;

  if (words.length === 0) {
    return [];
  }

  if (words.length === 1) {
    return [words];
  }

  const segments: MaybePartialWord[][] = [];
  let currentSegment: MaybePartialWord[] = [words[0]];

  for (let i = 1; i < words.length; i++) {
    const prevWord = words[i - 1];
    const currentWord = words[i];
    const gap = currentWord.start_ms - prevWord.end_ms;

    const shouldSplit = gap >= minGapMs
      || (currentSegment.length >= maxWordsPerSegment
        && (gap >= minGapMs / 2 || isSentenceEnding(prevWord.text)));

    if (shouldSplit) {
      segments.push(currentSegment);
      currentSegment = [currentWord];
    } else if (currentSegment.length >= maxWordsPerSegment) {
      let bestSplitIndex = -1;
      let bestScore = -1;

      for (let j = Math.max(0, currentSegment.length - 10); j < currentSegment.length; j++) {
        const wordAtJ = currentSegment[j];
        const nextWord = j + 1 < currentSegment.length ? currentSegment[j + 1] : currentWord;
        const gapAtJ = nextWord.start_ms - wordAtJ.end_ms;
        const score = calculateSplitScore(
          gapAtJ,
          isSentenceEnding(wordAtJ.text),
          { maxWordsPerSegment, minGapMs },
        );

        if (score > bestScore) {
          bestScore = score;
          bestSplitIndex = j;
        }
      }

      if (bestSplitIndex >= 0 && bestScore > 0) {
        const newSegment = currentSegment.slice(0, bestSplitIndex + 1);
        const remaining = currentSegment.slice(bestSplitIndex + 1);
        segments.push(newSegment);
        currentSegment = [...remaining, currentWord];
      } else {
        segments.push(currentSegment);
        currentSegment = [currentWord];
      }
    } else {
      currentSegment.push(currentWord);
    }
  }

  if (currentSegment.length > 0) {
    segments.push(currentSegment);
  }

  return segments;
}

export function groupIntoTurns(wordsByChannel: Map<number, MaybePartialWord[]>): Segment[] {
  const allWords: MaybePartialWord[] = [];

  wordsByChannel.forEach((words) => {
    allWords.push(...words);
  });

  allWords.sort((a, b) => a.start_ms - b.start_ms);

  if (allWords.length === 0) {
    return [];
  }

  const turns: Segment[] = [];
  let currentTurn: Segment = {
    channel: allWords[0].channel,
    words: [allWords[0]],
  };

  for (let i = 1; i < allWords.length; i++) {
    const word = allWords[i];

    if (word.channel === currentTurn.channel) {
      currentTurn.words.push(word);
    } else {
      turns.push(currentTurn);
      currentTurn = {
        channel: word.channel,
        words: [word],
      };
    }
  }

  turns.push(currentTurn);

  return turns;
}

export function mergeSameChannelSegments(segments: Segment[]): Segment[] {
  if (segments.length === 0) {
    return [];
  }

  const byChannel = new Map<number, Segment[]>();

  for (const segment of segments) {
    const channelSegments = byChannel.get(segment.channel) ?? [];
    channelSegments.push(segment);
    byChannel.set(segment.channel, channelSegments);
  }

  const merged: Segment[] = [];

  for (const [channel, channelSegments] of byChannel) {
    channelSegments.sort((a, b) => (a.words[0]?.start_ms ?? 0) - (b.words[0]?.start_ms ?? 0));

    let current = { channel, words: [...channelSegments[0].words] };

    for (let i = 1; i < channelSegments.length; i++) {
      const next = channelSegments[i];
      const gap = next.words.length > 0 && current.words.length > 0
        ? next.words[0].start_ms - current.words[current.words.length - 1].end_ms
        : Infinity;

      if (gap < 2000) {
        current.words.push(...next.words);
      } else {
        merged.push(current);
        current = { channel, words: [...next.words] };
      }
    }

    merged.push(current);
  }

  merged.sort((a, b) => (a.words[0]?.start_ms ?? 0) - (b.words[0]?.start_ms ?? 0));

  return merged;
}

export function buildSegments(
  finalWords: main.Word[],
  partialWords: PartialWord[][],
): Segment[] {
  const turns = groupIntoTurns(mergeWordsByChannel(finalWords, partialWords));
  return mergeSameChannelSegments(turns);
}

export interface SplitOptions {
  maxWordsPerSegment?: number;
  minGapMs?: number;
}

function isSentenceEnding(text: string): boolean {
  return /[.!?]$/.test(text.trim());
}

function calculateSplitScore(
  gap: number,
  isSentenceEnd: boolean,
  options: Required<SplitOptions>,
): number {
  let score = 0;

  if (gap >= options.minGapMs) {
    score += gap / 1000;
  }

  if (isSentenceEnd) {
    score += 10;
  }

  return score;
}
