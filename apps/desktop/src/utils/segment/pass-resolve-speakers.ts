import type {
  SegmentPass,
  SegmentWord,
  SpeakerIdentity,
  SpeakerState,
} from "./shared";

export function resolveSpeakerIdentity(
  word: SegmentWord,
  assignment: SpeakerIdentity | undefined,
  state: SpeakerState,
): SpeakerIdentity {
  const identity: SpeakerIdentity = {};

  if (assignment) {
    if (assignment.speaker_index !== undefined) {
      identity.speaker_index = assignment.speaker_index;
    }
    if (assignment.human_id !== undefined) {
      identity.human_id = assignment.human_id;
    }
  }

  if (identity.speaker_index !== undefined && identity.human_id === undefined) {
    const humanId = state.humanIdBySpeakerIndex.get(identity.speaker_index);
    if (humanId !== undefined) {
      identity.human_id = humanId;
    }
  }

  if (
    identity.human_id === undefined &&
    state.completeChannels.has(word.channel)
  ) {
    const channelHumanId = state.humanIdByChannel.get(word.channel);
    if (channelHumanId !== undefined) {
      identity.human_id = channelHumanId;
    }
  }

  if (
    !word.isFinal &&
    (identity.speaker_index === undefined || identity.human_id === undefined)
  ) {
    const last = state.lastSpeakerByChannel.get(word.channel);
    if (last) {
      if (
        identity.speaker_index === undefined &&
        last.speaker_index !== undefined
      ) {
        identity.speaker_index = last.speaker_index;
      }
      if (identity.human_id === undefined && last.human_id !== undefined) {
        identity.human_id = last.human_id;
      }
    }
  }

  return identity;
}

export function rememberIdentity(
  word: SegmentWord,
  assignment: SpeakerIdentity | undefined,
  identity: SpeakerIdentity,
  state: SpeakerState,
): void {
  const hasExplicitAssignment =
    assignment !== undefined &&
    (assignment.speaker_index !== undefined ||
      assignment.human_id !== undefined);

  if (identity.speaker_index !== undefined && identity.human_id !== undefined) {
    state.humanIdBySpeakerIndex.set(identity.speaker_index, identity.human_id);
  }

  if (
    state.completeChannels.has(word.channel) &&
    identity.human_id !== undefined &&
    identity.speaker_index === undefined
  ) {
    state.humanIdByChannel.set(word.channel, identity.human_id);
  }

  if (
    !word.isFinal ||
    identity.speaker_index !== undefined ||
    hasExplicitAssignment
  ) {
    if (
      identity.speaker_index !== undefined ||
      identity.human_id !== undefined
    ) {
      state.lastSpeakerByChannel.set(word.channel, { ...identity });
    }
  }
}

export const resolveIdentitiesPass: SegmentPass<"words"> = {
  id: "resolve_speakers",
  run(graph, ctx) {
    const frames = graph.words.map((word, index) => {
      const assignment = ctx.speakerState.assignmentByWordIndex.get(index);
      const identity = resolveSpeakerIdentity(
        word,
        assignment,
        ctx.speakerState,
      );
      rememberIdentity(word, assignment, identity, ctx.speakerState);

      return {
        word,
        identity,
      };
    });

    return { ...graph, frames };
  },
};
