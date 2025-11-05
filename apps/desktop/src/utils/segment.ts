import { Data, Schema } from "effect";

export enum ChannelProfile {
  DirectMic = 0,
  RemoteParty = 1,
  MixedCapture = 2,
}

export const ChannelProfileSchema = Schema.Enums(ChannelProfile);

export type WordLike = {
  text: string;
  start_ms: number;
  end_ms: number;
  channel: ChannelProfile;
};

export type PartialWord = WordLike;

export type SegmentWord = WordLike & { isFinal: boolean; id?: string };

type SpeakerHintData =
  | { type: "provider_speaker_index"; speaker_index: number; provider?: string; channel?: number }
  | { type: "user_speaker_assignment"; human_id: string };

export type RuntimeSpeakerHint = {
  wordIndex: number;
  data: SpeakerHintData;
};

export type Segment<TWord extends SegmentWord = SegmentWord> = {
  key: SegmentKey;
  words: TWord[];
};

export type SegmentKey = {
  readonly channel: ChannelProfile;
  readonly speaker_index?: number;
  readonly speaker_human_id?: string;
};

export const SegmentKey = {
  make: (
    params: { channel: ChannelProfile } & Partial<{ speaker_index: number; speaker_human_id: string }>,
  ): SegmentKey => Data.struct(params),
};

type SpeakerIdentity = {
  speaker_index?: number;
  human_id?: string;
};

type SpeakerState = {
  assignmentByWordIndex: Map<number, SpeakerIdentity>;
  humanIdBySpeakerIndex: Map<number, string>;
  humanIdByChannel: Map<ChannelProfile, string>;
  lastSpeakerByChannel: Map<ChannelProfile, SpeakerIdentity>;
  completeChannels: Set<ChannelProfile>;
};

export function buildSegments<
  TFinal extends WordLike,
  TPartial extends WordLike,
>(
  finalWords: readonly TFinal[],
  partialWords: readonly TPartial[],
  speakerHints: readonly RuntimeSpeakerHint[] = [],
  options?: { maxGapMs?: number; numSpeakers?: number },
): Segment[] {
  const words = normalizeWords(finalWords, partialWords);
  return segmentWords(words, speakerHints, options);
}

function segmentWords<TWord extends SegmentWord>(
  words: readonly TWord[],
  speakerHints: readonly RuntimeSpeakerHint[],
  options?: { maxGapMs?: number; numSpeakers?: number },
): Segment<TWord>[] {
  if (words.length === 0) {
    return [];
  }

  const state = createSpeakerState(speakerHints, options);
  const segments: Segment<TWord>[] = [];
  const activeSegments = new Map<string, Segment<TWord>>();

  words.forEach((word, index) => {
    const key = resolveSegmentKey(index, word, state);
    placeWordInSegment(word, key, segments, activeSegments, options);
  });

  propagateCompleteChannelIdentities(segments, state);

  return mergeAdjacentSegments(segments);
}

function createSpeakerState(
  speakerHints: readonly RuntimeSpeakerHint[],
  options?: { numSpeakers?: number },
): SpeakerState {
  const assignmentByWordIndex = new Map<number, SpeakerIdentity>();
  const humanIdBySpeakerIndex = new Map<number, string>();
  const humanIdByChannel = new Map<ChannelProfile, string>();
  const lastSpeakerByChannel = new Map<ChannelProfile, SpeakerIdentity>();
  const completeChannels = new Set<ChannelProfile>([ChannelProfile.DirectMic]);

  if (options?.numSpeakers === 2) {
    completeChannels.add(ChannelProfile.RemoteParty);
  }

  for (const hint of speakerHints) {
    const current = assignmentByWordIndex.get(hint.wordIndex) ?? {};
    if (hint.data.type === "provider_speaker_index") {
      current.speaker_index = hint.data.speaker_index;
    } else {
      current.human_id = hint.data.human_id;
    }
    assignmentByWordIndex.set(hint.wordIndex, { ...current });

    if (current.speaker_index !== undefined && current.human_id !== undefined) {
      humanIdBySpeakerIndex.set(current.speaker_index, current.human_id);
    }
  }

  return {
    assignmentByWordIndex,
    humanIdBySpeakerIndex,
    humanIdByChannel,
    lastSpeakerByChannel,
    completeChannels,
  };
}

function resolveSegmentKey<TWord extends SegmentWord>(
  wordIndex: number,
  word: TWord,
  state: SpeakerState,
): SegmentKey {
  const assignment = state.assignmentByWordIndex.get(wordIndex);
  const identity = resolveSpeakerIdentity(word, assignment, state);
  rememberIdentity(word, assignment, identity, state);

  const params: {
    channel: ChannelProfile;
    speaker_index?: number;
    speaker_human_id?: string;
  } = { channel: word.channel };

  if (identity.speaker_index !== undefined) {
    params.speaker_index = identity.speaker_index;
  }

  if (identity.human_id !== undefined) {
    params.speaker_human_id = identity.human_id;
  }

  return SegmentKey.make(params);
}

function resolveSpeakerIdentity<TWord extends SegmentWord>(
  word: TWord,
  assignment: SpeakerIdentity | undefined,
  state: SpeakerState,
): SpeakerIdentity {
  const identity: SpeakerIdentity = {
    speaker_index: assignment?.speaker_index,
    human_id: assignment?.human_id,
  };

  if (identity.speaker_index !== undefined && identity.human_id === undefined) {
    identity.human_id = state.humanIdBySpeakerIndex.get(identity.speaker_index);
  }

  if (identity.human_id === undefined && state.completeChannels.has(word.channel)) {
    const channelHumanId = state.humanIdByChannel.get(word.channel);
    if (channelHumanId !== undefined) {
      identity.human_id = channelHumanId;
    }
  }

  if (!word.isFinal && (identity.speaker_index === undefined || identity.human_id === undefined)) {
    const last = state.lastSpeakerByChannel.get(word.channel);
    if (last) {
      if (identity.speaker_index === undefined) {
        identity.speaker_index = last.speaker_index;
      }
      if (identity.human_id === undefined) {
        identity.human_id = last.human_id;
      }
    }
  }

  return identity;
}

function rememberIdentity<TWord extends SegmentWord>(
  word: TWord,
  assignment: SpeakerIdentity | undefined,
  identity: SpeakerIdentity,
  state: SpeakerState,
): void {
  const hasExplicitAssignment = assignment !== undefined
    && (assignment.speaker_index !== undefined || assignment.human_id !== undefined);

  if (identity.speaker_index !== undefined && identity.human_id !== undefined) {
    state.humanIdBySpeakerIndex.set(identity.speaker_index, identity.human_id);
  }

  if (
    state.completeChannels.has(word.channel)
    && identity.human_id !== undefined
    && identity.speaker_index === undefined
  ) {
    state.humanIdByChannel.set(word.channel, identity.human_id);
  }

  if (
    !word.isFinal
    || identity.speaker_index !== undefined
    || hasExplicitAssignment
  ) {
    if (identity.speaker_index !== undefined || identity.human_id !== undefined) {
      state.lastSpeakerByChannel.set(word.channel, { ...identity });
    }
  }
}

function placeWordInSegment<TWord extends SegmentWord>(
  word: TWord,
  key: SegmentKey,
  segments: Segment<TWord>[],
  activeSegments: Map<string, Segment<TWord>>,
  options?: { maxGapMs?: number },
): void {
  const segmentId = segmentKeyId(key);
  const existing = activeSegments.get(segmentId);

  if (existing && canExtend(existing, key, word, segments, options)) {
    existing.words.push(word);
    return;
  }

  if (word.isFinal && !hasSpeakerIdentity(key)) {
    for (const [id, segment] of activeSegments) {
      if (!hasSpeakerIdentity(segment.key) && segment.key.channel === key.channel) {
        if (canExtend(segment, segment.key, word, segments, options)) {
          segment.words.push(word);
          activeSegments.set(segmentId, segment);
          activeSegments.set(id, segment);
          return;
        }
      }
    }
  }

  const newSegment: Segment<TWord> = { key, words: [word] };
  segments.push(newSegment);
  activeSegments.set(segmentId, newSegment);
}

function canExtend<TWord extends SegmentWord>(
  existingSegment: Segment<TWord>,
  candidateKey: SegmentKey,
  word: TWord,
  segments: Segment<TWord>[],
  options?: { maxGapMs?: number },
): boolean {
  if (hasSpeakerIdentity(candidateKey)) {
    const lastSegment = segments[segments.length - 1];
    if (!lastSegment || !sameKey(lastSegment.key, candidateKey)) {
      return false;
    }
  }

  if (!word.isFinal && existingSegment !== segments[segments.length - 1]) {
    const allWordsArePartial = existingSegment.words.every((w) => !w.isFinal);
    if (!allWordsArePartial) {
      return false;
    }
  }

  const maxGapMs = options?.maxGapMs ?? 2000;
  const lastWord = existingSegment.words[existingSegment.words.length - 1];
  return word.start_ms - lastWord.end_ms <= maxGapMs;
}

function hasSpeakerIdentity(key: SegmentKey): boolean {
  return key.speaker_index !== undefined || key.speaker_human_id !== undefined;
}

function sameKey(a: SegmentKey, b: SegmentKey): boolean {
  return (
    a.channel === b.channel
    && a.speaker_index === b.speaker_index
    && a.speaker_human_id === b.speaker_human_id
  );
}

function segmentKeyId(key: SegmentKey): string {
  return JSON.stringify([key.channel, key.speaker_index ?? null, key.speaker_human_id ?? null]);
}

function propagateCompleteChannelIdentities<TWord extends SegmentWord>(
  segments: Segment<TWord>[],
  state: SpeakerState,
): void {
  state.completeChannels.forEach((channel) => {
    const humanId = state.humanIdByChannel.get(channel);
    if (!humanId) {
      return;
    }

    segments.forEach((segment) => {
      if (segment.key.channel !== channel || segment.key.speaker_human_id !== undefined) {
        return;
      }

      const params: {
        channel: ChannelProfile;
        speaker_index?: number;
        speaker_human_id: string;
      } = {
        channel,
        speaker_human_id: humanId,
      };

      if (segment.key.speaker_index !== undefined) {
        params.speaker_index = segment.key.speaker_index;
      }

      segment.key = SegmentKey.make(params);
    });
  });
}

function mergeAdjacentSegments<TWord extends SegmentWord>(segments: Segment<TWord>[]): Segment<TWord>[] {
  if (segments.length <= 1) {
    return segments;
  }

  const merged: Segment<TWord>[] = [];

  segments.forEach((segment) => {
    const last = merged[merged.length - 1];

    if (last && sameKey(last.key, segment.key) && canMergeSegments(last, segment)) {
      last.words.push(...segment.words);
      return;
    }

    merged.push(segment);
  });

  return merged;
}

function canMergeSegments<TWord extends SegmentWord>(
  seg1: Segment<TWord>,
  seg2: Segment<TWord>,
): boolean {
  if (!hasSpeakerIdentity(seg1.key) && !hasSpeakerIdentity(seg2.key)) {
    return false;
  }

  return true;
}

function normalizeWords<TFinal extends WordLike, TPartial extends WordLike>(
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

  return [...finalNormalized, ...partialNormalized].sort((a, b) => a.start_ms - b.start_ms);
}
