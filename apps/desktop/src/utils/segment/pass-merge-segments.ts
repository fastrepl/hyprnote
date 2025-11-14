import type { ProtoSegment, SegmentKey, SegmentPass } from "./shared";

export const mergeSegmentsPass: SegmentPass = {
  id: "merge_segments",
  needs: ["segments"],
  run(graph) {
    if (!graph.segments) {
      return graph;
    }

    return { ...graph, segments: mergeAdjacentSegments(graph.segments) };
  },
};

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

function canMergeSegments(seg1: ProtoSegment, seg2: ProtoSegment): boolean {
  if (!hasSpeakerIdentity(seg1.key) && !hasSpeakerIdentity(seg2.key)) {
    return false;
  }

  return true;
}

function mergeAdjacentSegments(segments: ProtoSegment[]): ProtoSegment[] {
  if (segments.length <= 1) {
    return segments;
  }

  const merged: ProtoSegment[] = [];

  segments.forEach((segment) => {
    const last = merged[merged.length - 1];

    if (
      last &&
      sameKey(last.key, segment.key) &&
      canMergeSegments(last, segment)
    ) {
      last.words.push(...segment.words);
      return;
    }

    merged.push(segment);
  });

  return merged;
}
