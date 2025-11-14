import { Data, Schema } from "effect";

import { type Store } from "../../store/tinybase/main";

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
  | {
      type: "provider_speaker_index";
      speaker_index: number;
      provider?: string;
      channel?: number;
    }
  | { type: "user_speaker_assignment"; human_id: string };

export type RuntimeSpeakerHint = {
  wordIndex: number;
  data: SpeakerHintData;
};

export type Segment<TWord extends SegmentWord = SegmentWord> = {
  key: SegmentKey;
  words: TWord[];
};

type RenderLabelContext = {
  getSelfHumanId: () => string | undefined;
  getHumanName: (id: string) => string | undefined;
};

export const defaultRenderLabelContext = (
  store: Pick<Store, "getValue" | "getRow">,
): RenderLabelContext => {
  return {
    getSelfHumanId: () => {
      const selfId = store.getValue("user_id");
      return typeof selfId === "string" ? selfId : undefined;
    },
    getHumanName: (id: string) => {
      const human = store.getRow("humans", id);
      return typeof human.name === "string" ? human.name : undefined;
    },
  };
};

export type SegmentKey = {
  readonly channel: ChannelProfile;
  readonly speaker_index?: number;
  readonly speaker_human_id?: string;
};

export const SegmentKey = {
  make: (
    params: { channel: ChannelProfile } & Partial<{
      speaker_index: number;
      speaker_human_id: string;
    }>,
  ): SegmentKey => Data.struct(params),

  hasSpeakerIdentity: (key: SegmentKey): boolean => {
    return (
      key.speaker_index !== undefined || key.speaker_human_id !== undefined
    );
  },

  equals: (a: SegmentKey, b: SegmentKey): boolean => {
    return (
      a.channel === b.channel &&
      a.speaker_index === b.speaker_index &&
      a.speaker_human_id === b.speaker_human_id
    );
  },

  serialize: (key: SegmentKey): string => {
    return JSON.stringify([
      key.channel,
      key.speaker_index ?? null,
      key.speaker_human_id ?? null,
    ]);
  },

  renderLabel: (key: SegmentKey, ctx?: RenderLabelContext): string => {
    if (ctx && key.speaker_human_id) {
      const human = ctx.getHumanName(key.speaker_human_id);
      if (human) {
        return human;
      }
    }

    if (ctx && key.channel === ChannelProfile.DirectMic) {
      const selfHumanId = ctx.getSelfHumanId();
      if (selfHumanId) {
        const selfHuman = ctx.getHumanName(selfHumanId);
        return selfHuman ?? "You";
      }
    }

    const channelLabel =
      key.channel === ChannelProfile.DirectMic
        ? "A"
        : key.channel === ChannelProfile.RemoteParty
          ? "B"
          : "C";

    return key.speaker_index !== undefined
      ? `Speaker ${key.speaker_index + 1}`
      : `Speaker ${channelLabel}`;
  },
};

export type SegmentBuilderOptions = {
  maxGapMs?: number;
  numSpeakers?: number;
};

export type StageId =
  | "normalize_words"
  | "resolve_speakers"
  | "build_segments"
  | "propagate_identity";

export type SpeakerIdentity = {
  speaker_index?: number;
  human_id?: string;
};

export type NormalizedWord = SegmentWord & { order: number };

export type ResolvedWordFrame = {
  word: NormalizedWord;
  identity?: SpeakerIdentity;
};

export type ProtoSegment = {
  key: SegmentKey;
  words: ResolvedWordFrame[];
};

export type SegmentGraph = {
  finalWords?: readonly WordLike[];
  partialWords?: readonly WordLike[];
  words?: NormalizedWord[];
  frames?: ResolvedWordFrame[];
  segments?: ProtoSegment[];
};

type RequireKeys<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

export type SegmentPass<TNeedsKeys extends keyof SegmentGraph = never> = {
  id: StageId;
  run: (
    graph: RequireKeys<SegmentGraph, TNeedsKeys>,
    ctx: SegmentPassContext,
  ) => SegmentGraph;
};

export type SegmentPassContext = {
  speakerHints: readonly RuntimeSpeakerHint[];
  options: SegmentBuilderOptions;
  speakerState: SpeakerState;
};

export type SpeakerState = {
  assignmentByWordIndex: Map<number, SpeakerIdentity>;
  humanIdBySpeakerIndex: Map<number, string>;
  humanIdByChannel: Map<ChannelProfile, string>;
  lastSpeakerByChannel: Map<ChannelProfile, SpeakerIdentity>;
  completeChannels: Set<ChannelProfile>;
};
