import type {
  ChannelProfile,
  ProtoSegment,
  ResolvedWordFrame,
  SegmentBuilderOptions,
  SegmentKey,
  SegmentPass,
  SpeakerIdentity,
} from "./shared";
import { SegmentKey as SegmentKeyModule } from "./shared";

export const segmentationPass: SegmentPass = {
  id: "build_segments",
  needs: ["frames"],
  run(graph, ctx) {
    const frames = graph.frames ?? [];
    const segments: ProtoSegment[] = [];
    const activeSegments = new Map<string, ProtoSegment>();

    frames.forEach((frame) => {
      const key = createSegmentKeyFromIdentity(
        frame.word.channel,
        frame.identity,
      );
      placeFrameInSegment(frame, key, segments, activeSegments, ctx.options);
    });

    return { ...graph, segments };
  },
};

function createSegmentKeyFromIdentity(
  channel: ChannelProfile,
  identity?: SpeakerIdentity,
): SegmentKey {
  const params: {
    channel: ChannelProfile;
    speaker_index?: number;
    speaker_human_id?: string;
  } = { channel };

  if (identity?.speaker_index !== undefined) {
    params.speaker_index = identity.speaker_index;
  }

  if (identity?.human_id !== undefined) {
    params.speaker_human_id = identity.human_id;
  }

  return SegmentKeyModule.make(params);
}

function hasSpeakerIdentity(key: SegmentKey): boolean {
  return key.speaker_index !== undefined || key.speaker_human_id !== undefined;
}

function sameKey(a: SegmentKey, b: SegmentKey): boolean {
  return (
    a.channel === b.channel &&
    a.speaker_index === b.speaker_index &&
    a.speaker_human_id === b.speaker_human_id
  );
}

function segmentKeyId(key: SegmentKey): string {
  return JSON.stringify([
    key.channel,
    key.speaker_index ?? null,
    key.speaker_human_id ?? null,
  ]);
}

function canExtendSegment(
  existingSegment: ProtoSegment,
  candidateKey: SegmentKey,
  frame: ResolvedWordFrame,
  segments: ProtoSegment[],
  options?: SegmentBuilderOptions,
): boolean {
  if (hasSpeakerIdentity(candidateKey)) {
    const lastSegment = segments[segments.length - 1];
    if (!lastSegment || !sameKey(lastSegment.key, candidateKey)) {
      return false;
    }
  }

  if (
    !frame.word.isFinal &&
    existingSegment !== segments[segments.length - 1]
  ) {
    const allWordsArePartial = existingSegment.words.every(
      (w) => !w.word.isFinal,
    );
    if (!allWordsArePartial) {
      return false;
    }
  }

  const maxGapMs = options?.maxGapMs ?? 2000;
  const lastWord = existingSegment.words[existingSegment.words.length - 1].word;
  return frame.word.start_ms - lastWord.end_ms <= maxGapMs;
}

function placeFrameInSegment(
  frame: ResolvedWordFrame,
  key: SegmentKey,
  segments: ProtoSegment[],
  activeSegments: Map<string, ProtoSegment>,
  options?: SegmentBuilderOptions,
): void {
  const segmentId = segmentKeyId(key);
  const existing = activeSegments.get(segmentId);

  if (existing && canExtendSegment(existing, key, frame, segments, options)) {
    existing.words.push(frame);
    return;
  }

  if (frame.word.isFinal && !hasSpeakerIdentity(key)) {
    for (const [id, segment] of activeSegments) {
      if (
        !hasSpeakerIdentity(segment.key) &&
        segment.key.channel === key.channel
      ) {
        if (canExtendSegment(segment, segment.key, frame, segments, options)) {
          segment.words.push(frame);
          activeSegments.set(segmentId, segment);
          activeSegments.set(id, segment);
          return;
        }
      }
    }
  }

  const newSegment: ProtoSegment = { key, words: [frame] };
  segments.push(newSegment);
  activeSegments.set(segmentId, newSegment);
}
