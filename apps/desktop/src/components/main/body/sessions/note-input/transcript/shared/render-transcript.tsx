import { cn } from "@hypr/utils";

import { memo, useEffect, useMemo } from "react";

import { useVirtualizer } from "@tanstack/react-virtual";
import * as main from "../../../../../../../store/tinybase/main";
import { buildSegments, PartialWord, RuntimeSpeakerHint, Segment } from "../../../../../../../utils/segment";
import { useFinalSpeakerHints, useFinalWords, useSessionSpeakers, useTranscriptOffset } from "./hooks";
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

  const segments = useMemo(
    () => buildSegments(finalWords, partialWords, allSpeakerHints, { numSpeakers }),
    [finalWords, partialWords, allSpeakerHints, numSpeakers],
  );

  const offsetMs = useTranscriptOffset(transcriptId);

  if (segments.length === 0) {
    return null;
  }

  return (
    <VirtualizedSegments
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

const VirtualizedSegments = memo(({
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
  const estimatedSegmentSize = 160;
  const overscan = useMemo(() => {
    if (!scrollElement) {
      return 5;
    }
    const viewportItemCount = Math.ceil(scrollElement.clientHeight / estimatedSegmentSize);
    return Math.max(5, Math.ceil(viewportItemCount * 2));
  }, [scrollElement]);

  const virtualizer = useVirtualizer({
    count: segments.length,
    getScrollElement: () => scrollElement,
    estimateSize: () => estimatedSegmentSize,
    overscan,
    getItemKey: (index) => {
      const segment = segments[index];
      const firstWord = segment.words[0];
      const lastWord = segment.words[segment.words.length - 1];
      const transcriptKey = transcriptId;
      const firstIdentifier = firstWord?.id ?? `${firstWord?.start_ms}-${firstWord?.text ?? "start"}`;
      const lastIdentifier = lastWord?.id ?? `${lastWord?.end_ms}-${lastWord?.text ?? "end"}`;
      return `${transcriptKey}-${firstIdentifier}-${lastIdentifier}-${index}`;
    },
  });

  useEffect(() => {
    if (!scrollElement || !shouldScrollToEnd || segments.length === 0) {
      return;
    }
    const raf = requestAnimationFrame(() => {
      virtualizer.scrollToIndex(segments.length - 1, { align: "end", behavior: "auto" });
    });
    return () => cancelAnimationFrame(raf);
  }, [scrollElement, shouldScrollToEnd, segments.length, virtualizer]);

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div
      style={{
        height: `${virtualizer.getTotalSize()}px`,
        width: "100%",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          transform: `translateY(${virtualItems[0]?.start ?? 0}px)`,
        }}
      >
        {virtualItems.map((virtualItem) => {
          const segment = segments[virtualItem.index];

          return (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              className={cn([
                virtualItem.index > 0 && "pt-8",
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
          );
        })}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Exclude `editable` and `operations` from comparison to prevent virtualizer reinitialization
  // when toggling edit mode. Only SegmentRenderer children need to re-render, not the virtualizer itself.
  return (
    prevProps.transcriptId === nextProps.transcriptId
    && prevProps.scrollElement === nextProps.scrollElement
    && prevProps.offsetMs === nextProps.offsetMs
    && prevProps.sessionId === nextProps.sessionId
    && prevProps.shouldScrollToEnd === nextProps.shouldScrollToEnd
    && prevProps.segments === nextProps.segments
  );
});
