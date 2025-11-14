import { segmentationPass } from "./pass-build-segments";
import { mergeSegmentsPass } from "./pass-merge-segments";
import { normalizeWordsPass } from "./pass-normalize-words";
import { identityPropagationPass } from "./pass-propagate-identity";
import { resolveIdentitiesPass } from "./pass-resolve-speakers";
import type {
  ChannelProfile,
  ProtoSegment,
  RuntimeSpeakerHint,
  Segment,
  SegmentBuilderOptions,
  SegmentGraph,
  SegmentPass,
  SegmentPassContext,
  SegmentWord,
  SpeakerIdentity,
  SpeakerState,
  WordLike,
} from "./shared";

export {
  ChannelProfile,
  ChannelProfileSchema,
  SegmentKey,
  type PartialWord,
  type RuntimeSpeakerHint,
  type Segment,
  type SegmentBuilderOptions,
  type SegmentWord,
  type WordLike,
} from "./shared";

export function buildSegments<
  TFinal extends WordLike,
  TPartial extends WordLike,
>(
  finalWords: readonly TFinal[],
  partialWords: readonly TPartial[],
  speakerHints: readonly RuntimeSpeakerHint[] = [],
  options?: SegmentBuilderOptions,
): Segment[] {
  if (finalWords.length === 0 && partialWords.length === 0) {
    return [];
  }

  const context = createSegmentPassContext(speakerHints, options);
  const initialGraph: SegmentGraph = {
    finalWords,
    partialWords,
  };

  const graph = runSegmentPipeline(
    [
      normalizeWordsPass,
      resolveIdentitiesPass,
      segmentationPass,
      identityPropagationPass,
      mergeSegmentsPass,
    ],
    initialGraph,
    context,
  );
  return finalizeSegments(graph.segments ?? []);
}

function createSpeakerState(
  speakerHints: readonly RuntimeSpeakerHint[],
  options?: SegmentBuilderOptions,
): SpeakerState {
  const assignmentByWordIndex = new Map<number, SpeakerIdentity>();
  const humanIdBySpeakerIndex = new Map<number, string>();
  const humanIdByChannel = new Map<ChannelProfile, string>();
  const lastSpeakerByChannel = new Map<ChannelProfile, SpeakerIdentity>();
  const completeChannels = new Set<ChannelProfile>();
  completeChannels.add(0);

  if (options?.numSpeakers === 2) {
    completeChannels.add(1);
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

function createSegmentPassContext(
  speakerHints: readonly RuntimeSpeakerHint[],
  options?: SegmentBuilderOptions,
): SegmentPassContext {
  const resolvedOptions: SegmentBuilderOptions = options ? { ...options } : {};
  return {
    speakerHints,
    options: resolvedOptions,
    speakerState: createSpeakerState(speakerHints, resolvedOptions),
  };
}

function ensurePassRequirements(pass: SegmentPass, graph: SegmentGraph) {
  if (!pass.needs || pass.needs.length === 0) {
    return;
  }

  const missing = pass.needs.filter((key) => graph[key] === undefined);
  if (missing.length > 0) {
    throw new Error(
      `Segment pass "${pass.id}" missing required graph keys: ${missing.join(", ")}`,
    );
  }
}

function runSegmentPipeline(
  passes: readonly SegmentPass[],
  initialGraph: SegmentGraph,
  ctx: SegmentPassContext,
): SegmentGraph {
  return passes.reduce((graph, pass) => {
    ensurePassRequirements(pass, graph);
    return pass.run(graph, ctx);
  }, initialGraph);
}

function finalizeSegments(segments: ProtoSegment[]): Segment[] {
  return segments.map((segment) => ({
    key: segment.key,
    words: segment.words.map(({ word }) => {
      const { order: _order, ...rest } = word;
      return rest as SegmentWord;
    }),
  }));
}
