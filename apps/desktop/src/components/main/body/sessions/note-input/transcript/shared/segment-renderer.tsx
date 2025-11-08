import { cn } from "@hypr/utils";

import { memo, useCallback } from "react";

import { useAudioPlayer } from "../../../../../../../contexts/audio-player/provider";
import { Segment, SegmentWord } from "../../../../../../../utils/segment";
import { Operations } from "./operations";
import { SegmentHeader } from "./segment-header";
import { getWordHighlightState } from "./utils";
import { WordSpan } from "./word-span";

export const SegmentRenderer = memo(({
  editable,
  segment,
  offsetMs,
  operations,
  sessionId,
}: {
  editable: boolean;
  segment: Segment;
  offsetMs: number;
  operations?: Operations;
  sessionId?: string;
}) => {
  const { time, seek, start, audioExists } = useAudioPlayer();
  const currentMs = time.current * 1000;

  const seekAndPlay = useCallback((word: SegmentWord) => {
    if (audioExists) {
      seek((offsetMs + word.start_ms) / 1000);
      start();
    }
  }, [audioExists, offsetMs, seek, start]);

  return (
    <section>
      <SegmentHeader segment={segment} operations={operations} sessionId={sessionId} />

      <div
        className={cn([
          "mt-1.5 text-sm leading-relaxed break-words overflow-wrap-anywhere",
          editable && "select-text-deep",
        ])}
      >
        {segment.words.map((word, idx) => {
          const wordStartMs = offsetMs + word.start_ms;
          const wordEndMs = offsetMs + word.end_ms;

          const highlightState = getWordHighlightState({
            editable,
            audioExists,
            currentMs,
            wordStartMs,
            wordEndMs,
          });

          return (
            <WordSpan
              key={word.id ?? `${word.start_ms}-${idx}`}
              word={word}
              highlightState={highlightState}
              audioExists={audioExists}
              operations={operations}
              onClickWord={() => seekAndPlay(word)}
            />
          );
        })}
      </div>
    </section>
  );
}, (prev, next) => {
  return (
    prev.editable === next.editable
    && prev.segment === next.segment
    && prev.offsetMs === next.offsetMs
    && prev.operations === next.operations
    && prev.sessionId === next.sessionId
  );
});
