import type { ProtoSegment, SegmentPass } from "./shared";
import { SegmentKey as SegmentKeyUtils } from "./shared";

export const mergeSegmentsPass: SegmentPass<"segments"> = {
  id: "merge_segments",
  run(graph) {
    return { ...graph, segments: mergeAdjacentSegments(graph.segments) };
  },
};

function mergeAdjacentSegments(segments: ProtoSegment[]): ProtoSegment[] {
  if (segments.length <= 1) {
    return segments;
  }

  const merged: ProtoSegment[] = [];

  segments.forEach((segment) => {
    const last = merged[merged.length - 1];

    if (
      last &&
      SegmentKeyUtils.equals(last.key, segment.key) &&
      SegmentKeyUtils.hasSpeakerIdentity(segment.key)
    ) {
      last.words.push(...segment.words);
      return;
    }

    merged.push(segment);
  });

  return merged;
}
