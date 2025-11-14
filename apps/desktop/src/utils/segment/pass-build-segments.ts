import type {
  ChannelProfile,
  ProtoSegment,
  ResolvedWordFrame,
  SegmentBuilderOptions,
  SegmentKey,
  SegmentPass,
  SpeakerIdentity,
} from "./shared";
import { SegmentKey as SegmentKeyUtils } from "./shared";

export const segmentationPass: SegmentPass<"frames"> = {
  id: "build_segments",
  run(graph, ctx) {
    const segments: ProtoSegment[] = [];
    const activeSegments = new Map<string, ProtoSegment>();
    const lastAnonymousSegmentByChannel = new Map<
      ChannelProfile,
      ProtoSegment
    >();

    graph.frames.forEach((frame) => {
      const key = createSegmentKeyFromIdentity(
        frame.word.channel,
        frame.identity,
      );
      placeFrameInSegment(
        frame,
        key,
        segments,
        activeSegments,
        lastAnonymousSegmentByChannel,
        ctx.options,
      );
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

  return SegmentKeyUtils.make(params);
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
  if (SegmentKeyUtils.hasSpeakerIdentity(candidateKey)) {
    const lastSegment = segments[segments.length - 1];
    if (
      !lastSegment ||
      !SegmentKeyUtils.equals(lastSegment.key, candidateKey)
    ) {
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
  lastAnonymousSegmentByChannel: Map<ChannelProfile, ProtoSegment>,
  options?: SegmentBuilderOptions,
): void {
  const segmentId = segmentKeyId(key);
  const existing = activeSegments.get(segmentId);

  if (existing && canExtendSegment(existing, key, frame, segments, options)) {
    existing.words.push(frame);
    if (!SegmentKeyUtils.hasSpeakerIdentity(existing.key)) {
      lastAnonymousSegmentByChannel.set(existing.key.channel, existing);
    }
    return;
  }

  if (frame.word.isFinal && !SegmentKeyUtils.hasSpeakerIdentity(key)) {
    const segment = lastAnonymousSegmentByChannel.get(key.channel);
    if (
      segment &&
      canExtendSegment(segment, segment.key, frame, segments, options)
    ) {
      segment.words.push(frame);
      activeSegments.set(segmentId, segment);
      lastAnonymousSegmentByChannel.set(key.channel, segment);
      return;
    }
  }

  const newSegment: ProtoSegment = { key, words: [frame] };
  segments.push(newSegment);
  activeSegments.set(segmentId, newSegment);
  if (!SegmentKeyUtils.hasSpeakerIdentity(newSegment.key)) {
    lastAnonymousSegmentByChannel.set(newSegment.key.channel, newSegment);
  }
}
