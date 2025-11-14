import type {
  SegmentPass,
  SegmentWord,
  SpeakerIdentity,
  SpeakerState,
} from "./shared";

type IdentityRule = (ctx: IdentityRuleContext) => void;

type SpeakerStateSnapshot = Pick<
  SpeakerState,
  | "completeChannels"
  | "humanIdByChannel"
  | "humanIdBySpeakerIndex"
  | "lastSpeakerByChannel"
>;

type IdentityRuleContext = {
  assignment?: SpeakerIdentity;
  identity: SpeakerIdentity;
  snapshot: SpeakerStateSnapshot;
  word: SegmentWord;
};

const identityRules: IdentityRule[] = [
  applyExplicitAssignment,
  applySpeakerIndexHumanId,
  applyChannelHumanId,
  carryPartialIdentityForward,
];

class SpeakerTracker {
  constructor(private readonly state: SpeakerState) {}

  inferIdentity(
    word: SegmentWord,
    assignment: SpeakerIdentity | undefined,
  ): SpeakerIdentity {
    const identity = applyIdentityRules(word, assignment, this.state);
    rememberIdentity(word, assignment, identity, this.state);
    return identity;
  }
}

export const resolveIdentitiesPass: SegmentPass<"words"> = {
  id: "resolve_speakers",
  run(graph, ctx) {
    const tracker = new SpeakerTracker(ctx.speakerState);
    const frames = graph.words.map((word, index) => {
      const assignment = ctx.speakerState.assignmentByWordIndex.get(index);
      const identity = tracker.inferIdentity(word, assignment);

      return {
        word,
        identity,
      };
    });

    return { ...graph, frames };
  },
};

function applyIdentityRules(
  word: SegmentWord,
  assignment: SpeakerIdentity | undefined,
  snapshot: SpeakerStateSnapshot,
): SpeakerIdentity {
  const identity: SpeakerIdentity = {};
  const ctx: IdentityRuleContext = {
    assignment,
    identity,
    snapshot,
    word,
  };
  identityRules.forEach((rule) => rule(ctx));
  return identity;
}

function rememberIdentity(
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

function applyExplicitAssignment(ctx: IdentityRuleContext): void {
  if (!ctx.assignment) {
    return;
  }
  if (ctx.assignment.speaker_index !== undefined) {
    ctx.identity.speaker_index = ctx.assignment.speaker_index;
  }
  if (ctx.assignment.human_id !== undefined) {
    ctx.identity.human_id = ctx.assignment.human_id;
  }
}

function applySpeakerIndexHumanId(ctx: IdentityRuleContext): void {
  if (
    ctx.identity.speaker_index === undefined ||
    ctx.identity.human_id !== undefined
  ) {
    return;
  }

  const humanId = ctx.snapshot.humanIdBySpeakerIndex.get(
    ctx.identity.speaker_index,
  );
  if (humanId !== undefined) {
    ctx.identity.human_id = humanId;
  }
}

function applyChannelHumanId(ctx: IdentityRuleContext): void {
  if (ctx.identity.human_id !== undefined) {
    return;
  }

  if (!ctx.snapshot.completeChannels.has(ctx.word.channel)) {
    return;
  }

  const humanId = ctx.snapshot.humanIdByChannel.get(ctx.word.channel);
  if (humanId !== undefined) {
    ctx.identity.human_id = humanId;
  }
}

function carryPartialIdentityForward(ctx: IdentityRuleContext): void {
  if (
    ctx.word.isFinal ||
    (ctx.identity.speaker_index !== undefined &&
      ctx.identity.human_id !== undefined)
  ) {
    return;
  }

  const last = ctx.snapshot.lastSpeakerByChannel.get(ctx.word.channel);
  if (!last) {
    return;
  }

  if (
    ctx.identity.speaker_index === undefined &&
    last.speaker_index !== undefined
  ) {
    ctx.identity.speaker_index = last.speaker_index;
  }
  if (ctx.identity.human_id === undefined && last.human_id !== undefined) {
    ctx.identity.human_id = last.human_id;
  }
}
