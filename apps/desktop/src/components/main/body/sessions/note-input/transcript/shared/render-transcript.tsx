import { cn } from "@hypr/utils";

import { memo, useEffect, useMemo } from "react";
import * as main from "../../../../../../../store/tinybase/main";
import { PartialWord, RuntimeSpeakerHint, Segment } from "../../../../../../../utils/segment";
import {
  createSegmentKey,
  segmentsShallowEqual,
  useFinalSpeakerHints,
  useFinalWords,
  useSessionSpeakers,
  useStableSegments,
  useTranscriptOffset,
} from "./hooks";
import { Operations } from "./operations";
import { SegmentRenderer } from "./segment-renderer";

export function RenderTranscript({
  scrollElement,
  isLastTranscript,
  isAtBottom,
  editable,
  transcriptId,
  partialWords,
  partialHints,
  operations,
}: {
  scrollElement: HTMLDivElement | null;
  isLastTranscript: boolean;
  isAtBottom: boolean;
  editable: boolean;
  transcriptId: string;
  partialWords: PartialWord[];
  partialHints: RuntimeSpeakerHint[];
  operations?: Operations;
}) {
  const finalWords = useFinalWords(transcriptId);
  const finalSpeakerHints = useFinalSpeakerHints(transcriptId);

  const sessionId = main.UI.useCell("transcripts", transcriptId, "session_id", main.STORE_ID) as string | undefined;
  const numSpeakers = useSessionSpeakers(sessionId);

  const allSpeakerHints = useMemo(() => {
    const finalWordsCount = finalWords.length;
    const adjustedPartialHints = partialHints.map((hint) => ({
      ...hint,
      wordIndex: finalWordsCount + hint.wordIndex,
    }));
    return [...finalSpeakerHints, ...adjustedPartialHints];
  }, [finalWords.length, finalSpeakerHints, partialHints]);

  const segments = useStableSegments(
    finalWords,
    partialWords,
    allSpeakerHints,
    { numSpeakers },
  );

  const offsetMs = useTranscriptOffset(transcriptId);

  if (segments.length === 0) {
    return null;
  }

  return (
    <SegmentsList
      segments={segments}
      scrollElement={scrollElement}
      transcriptId={transcriptId}
      editable={editable}
      offsetMs={offsetMs}
      operations={operations}
      sessionId={sessionId}
      shouldScrollToEnd={isLastTranscript && isAtBottom}
    />
  );
}

const SegmentsList = memo(({
  segments,
  scrollElement,
  transcriptId,
  editable,
  offsetMs,
  operations,
  sessionId,
  shouldScrollToEnd,
}: {
  segments: Segment[];
  scrollElement: HTMLDivElement | null;
  transcriptId: string;
  editable: boolean;
  offsetMs: number;
  operations?: Operations;
  sessionId?: string;
  shouldScrollToEnd: boolean;
}) => {
  useEffect(() => {
    if (!scrollElement || !shouldScrollToEnd) {
      return;
    }
    const raf = requestAnimationFrame(() => {
      scrollElement.scrollTo({
        top: scrollElement.scrollHeight,
        behavior: "auto",
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [scrollElement, shouldScrollToEnd, segments.length]);

  return (
    <div>
      {segments.map((segment, index) => (
        <div
          key={createSegmentKey(segment, transcriptId, index)}
          className={cn([
            index > 0 && "pt-8",
          ])}
        >
          <SegmentRenderer
            editable={editable}
            segment={segment}
            offsetMs={offsetMs}
            operations={operations}
            sessionId={sessionId}
          />
        </div>
      ))}
    </div>
  );
}, (prevProps, nextProps) => {
  // Exclude `editable` and `operations` from comparison so toggling edit mode
  // doesn't force the entire list to rerender. SegmentRenderer handles that instead.
  return (
    prevProps.transcriptId === nextProps.transcriptId
    && prevProps.scrollElement === nextProps.scrollElement
    && prevProps.offsetMs === nextProps.offsetMs
    && prevProps.sessionId === nextProps.sessionId
    && prevProps.shouldScrollToEnd === nextProps.shouldScrollToEnd
    && segmentsShallowEqual(prevProps.segments, nextProps.segments)
  );
});
