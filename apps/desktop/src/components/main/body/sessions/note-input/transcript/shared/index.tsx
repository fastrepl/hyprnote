import { useCallback, useRef, useState } from "react";

import { cn } from "@hypr/utils";

import { useListener } from "../../../../../../../contexts/listener";
import * as main from "../../../../../../../store/tinybase/main";
import type { RuntimeSpeakerHint } from "../../../../../../../utils/segment";
import { useAutoScroll, useScrollDetection } from "./hooks";
import { Operations } from "./operations";
import { RenderTranscript } from "./render-transcript";
import { SelectionMenu } from "./selection-menu";

export { SegmentRenderer } from "./segment-renderer";

export function TranscriptContainer({
  sessionId,
  operations,
}: {
  sessionId: string;
  operations?: Operations;
}) {
  const transcriptIds = main.UI.useSliceRowIds(
    main.INDEXES.transcriptBySession,
    sessionId,
    main.STORE_ID,
  );

  const sessionMode = useListener((state) => state.getSessionMode(sessionId));
  const currentActive =
    sessionMode === "running_active" || sessionMode === "finalizing";
  const editable =
    sessionMode === "inactive" && Object.keys(operations ?? {}).length > 0;
  const partialWords = useListener((state) =>
    Object.values(state.partialWordsByChannel).flat(),
  );
  const partialHints = useListener((state) => {
    const channelIndices = Object.keys(state.partialWordsByChannel)
      .map(Number)
      .sort((a, b) => a - b);

    const offsetByChannel = new Map<number, number>();
    let currentOffset = 0;
    for (const channelIndex of channelIndices) {
      offsetByChannel.set(channelIndex, currentOffset);
      currentOffset += state.partialWordsByChannel[channelIndex]?.length ?? 0;
    }

    const reindexedHints: RuntimeSpeakerHint[] = [];
    for (const channelIndex of channelIndices) {
      const hints = state.partialHintsByChannel[channelIndex] ?? [];
      const offset = offsetByChannel.get(channelIndex) ?? 0;
      for (const hint of hints) {
        reindexedHints.push({
          ...hint,
          wordIndex: hint.wordIndex + offset,
        });
      }
    }

    return reindexedHints;
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(
    null,
  );
  const handleContainerRef = useCallback((node: HTMLDivElement | null) => {
    containerRef.current = node;
    setScrollElement(node);
  }, []);

  const { isAtBottom, scrollToBottom } = useScrollDetection(containerRef);
  useAutoScroll(containerRef, [transcriptIds, partialWords]);

  if (transcriptIds.length === 0) {
    return null;
  }

  const handleSelectionAction = (action: string, selectedText: string) => {
    if (action === "copy") {
      navigator.clipboard.writeText(selectedText);
    }
  };

  return (
    <div className="relative h-full">
      <div
        ref={handleContainerRef}
        data-transcript-container
        className={cn([
          "space-y-8 h-full overflow-y-auto overflow-x-hidden",
          "pb-16 scroll-pb-[8rem] scrollbar-hide",
        ])}
      >
        {transcriptIds.map((transcriptId, index) => (
          <div key={transcriptId} className="space-y-8">
            <RenderTranscript
              scrollElement={scrollElement}
              isLastTranscript={index === transcriptIds.length - 1}
              isAtBottom={isAtBottom}
              editable={editable}
              transcriptId={transcriptId}
              partialWords={
                index === transcriptIds.length - 1 ? partialWords : []
              }
              partialHints={
                index === transcriptIds.length - 1 ? partialHints : []
              }
              operations={operations}
            />
            {index < transcriptIds.length - 1 && <TranscriptSeparator />}
          </div>
        ))}

        {editable && (
          <SelectionMenu
            containerRef={containerRef}
            onAction={handleSelectionAction}
          />
        )}
      </div>

      {!isAtBottom && currentActive && (
        <button
          onClick={scrollToBottom}
          className={cn([
            "absolute bottom-3 left-1/2 -translate-x-1/2",
            "px-4 py-2 rounded-full",
            "shadow-lg bg-neutral-800 hover:bg-neutral-700",
            "text-white text-xs font-light",
            "transition-all duration-200",
            "z-30",
          ])}
        >
          Go to bottom
        </button>
      )}
    </div>
  );
}

function TranscriptSeparator() {
  return (
    <div
      className={cn([
        "flex items-center gap-3",
        "text-neutral-400 text-xs font-light",
      ])}
    >
      <div className="flex-1 border-t border-neutral-200/40" />
      <span>~ ~ ~ ~ ~ ~ ~ ~ ~</span>
      <div className="flex-1 border-t border-neutral-200/40" />
    </div>
  );
}
