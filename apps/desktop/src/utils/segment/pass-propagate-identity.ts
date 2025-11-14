import type {
  ChannelProfile,
  ProtoSegment,
  SegmentPass,
  SpeakerState,
} from "./shared";
import { SegmentKey as SegmentKeyModule } from "./shared";

export function propagateCompleteChannelIdentities(
  segments: ProtoSegment[],
  state: SpeakerState,
): void {
  state.completeChannels.forEach((channel) => {
    const humanId = state.humanIdByChannel.get(channel);
    if (!humanId) {
      return;
    }

    segments.forEach((segment) => {
      if (
        segment.key.channel !== channel ||
        segment.key.speaker_human_id !== undefined
      ) {
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

      segment.key = SegmentKeyModule.make(params);
    });
  });
}

export const identityPropagationPass: SegmentPass = {
  id: "propagate_identity",
  needs: ["segments"],
  run(graph, ctx) {
    if (!graph.segments) {
      return graph;
    }

    const segments = graph.segments.map((segment) => ({
      ...segment,
      words: [...segment.words],
    }));

    propagateCompleteChannelIdentities(segments, ctx.speakerState);
    return { ...graph, segments };
  },
};
