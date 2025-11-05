import { DependencyList, Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@hypr/ui/components/ui/context-menu";
import { cn } from "@hypr/utils";
import { useAudioPlayer } from "../../../../../../../contexts/audio-player/provider";
import { useListener } from "../../../../../../../contexts/listener";
import * as main from "../../../../../../../store/tinybase/main";
import {
  buildSegments,
  PartialWord,
  RuntimeSpeakerHint,
  Segment,
  SegmentWord,
} from "../../../../../../../utils/segment";
import { convertStorageHintsToRuntime } from "../../../../../../../utils/speaker-hints";
import { Operations } from "./operations";
import { SegmentHeader } from "./segment-header";
import { SelectionMenu } from "./selection-menu";

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

  const currentActive = useListener((state) => state.status !== "inactive" && state.sessionId === sessionId);
  const editable = useListener((state) => state.status === "inactive" && Object.keys(operations ?? {}).length > 0);
  const partialWords = useListener((state) => Object.values(state.partialWordsByChannel).flat());
  const partialHints = useListener((state) => state.partialHints);

  const { containerRef, isAtBottom, scrollToBottom } = useScrollToBottom([transcriptIds]);

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
        ref={containerRef}
        className={cn([
          "space-y-8 h-full overflow-y-auto overflow-x-hidden",
          "pb-16 scroll-pb-[8rem] scrollbar-hide",
        ])}
      >
        {transcriptIds.map(
          (transcriptId, index) => (
            <Fragment key={transcriptId}>
              <RenderTranscript
                editable={editable}
                transcriptId={transcriptId}
                partialWords={(index === transcriptIds.length - 1) ? partialWords : []}
                partialHints={(index === transcriptIds.length - 1) ? partialHints : []}
                operations={operations}
              />
              {index < transcriptIds.length - 1 && <TranscriptSeparator />}
            </Fragment>
          ),
        )}

        {editable && (
          <SelectionMenu
            containerRef={containerRef}
            onAction={handleSelectionAction}
          />
        )}
      </div>

      {(!isAtBottom && currentActive) && (
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

function RenderTranscript(
  {
    editable,
    transcriptId,
    partialWords,
    partialHints,
    operations,
  }: {
    editable: boolean;
    transcriptId: string;
    partialWords: PartialWord[];
    partialHints: RuntimeSpeakerHint[];
    operations?: Operations;
  },
) {
  const finalWords = useFinalWords(transcriptId);
  const finalSpeakerHints = useFinalSpeakerHints(transcriptId);

  const allSpeakerHints = useMemo(() => {
    const finalWordsCount = finalWords.length;
    const adjustedPartialHints = partialHints.map((hint) => ({
      ...hint,
      wordIndex: finalWordsCount + hint.wordIndex,
    }));
    return [...finalSpeakerHints, ...adjustedPartialHints];
  }, [finalWords.length, finalSpeakerHints, partialHints]);

  const segments = buildSegments(finalWords, partialWords, allSpeakerHints);
  const offsetMs = useTranscriptOffset(transcriptId);

  if (segments.length === 0) {
    return null;
  }

  return (
    <>
      {segments.map(
        (segment, i) => (
          <SegmentRenderer
            key={i}
            editable={editable}
            segment={segment}
            offsetMs={offsetMs}
            operations={operations}
          />
        ),
      )}
    </>
  );
}

export function SegmentRenderer(
  {
    editable,
    segment,
    offsetMs,
    operations,
  }: {
    editable: boolean;
    segment: Segment;
    offsetMs: number;
    operations?: Operations;
  },
) {
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
      <SegmentHeader segment={segment} operations={operations} />

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
              onSeekAndPlay={() => seekAndPlay(word)}
            />
          );
        })}
      </div>
    </section>
  );
}

function WordSpan({
  word,
  highlightState,
  audioExists,
  operations,
  onSeekAndPlay,
}: {
  word: SegmentWord;
  highlightState: "current" | "buffer" | "none";
  audioExists: boolean;
  operations?: Operations;
  onSeekAndPlay: () => void;
}) {
  const mode = operations && Object.keys(operations).length > 0 ? "editor" : "viewer";
  const className = cn([
    audioExists && "cursor-pointer",
    audioExists && highlightState !== "none" && "hover:bg-neutral-200/60",
    !word.isFinal && ["opacity-60", "italic"],
    highlightState === "current" && "bg-blue-200/70",
    highlightState === "buffer" && "bg-blue-200/30",
  ]);

  if (mode === "editor" && word.id) {
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <span onClick={onSeekAndPlay} className={className}>
            {word.text}
          </span>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => operations?.onDeleteWord?.(word.id!)}>
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  }

  return (
    <span onClick={onSeekAndPlay} className={className}>
      {word.text}
    </span>
  );
}

function useFinalWords(transcriptId: string): (main.Word & { id: string })[] {
  const store = main.UI.useStore(main.STORE_ID);
  const wordIds = main.UI.useSliceRowIds(main.INDEXES.wordsByTranscript, transcriptId, main.STORE_ID);

  return useMemo(() => {
    if (!store) {
      return [];
    }

    const words: (main.Word & { id: string })[] = [];
    wordIds?.forEach((wordId) => {
      const word = store.getRow("words", wordId);
      if (word) {
        words.push({ ...(word as main.Word), id: wordId });
      }
    });
    return words;
  }, [store, wordIds]);
}

function useFinalSpeakerHints(transcriptId: string): RuntimeSpeakerHint[] {
  const store = main.UI.useStore(main.STORE_ID);
  const wordIds = main.UI.useSliceRowIds(main.INDEXES.wordsByTranscript, transcriptId, main.STORE_ID);
  const speakerHintIds = main.UI.useSliceRowIds(main.INDEXES.speakerHintsByTranscript, transcriptId, main.STORE_ID);

  return useMemo(() => {
    if (!store || !wordIds) {
      return [];
    }

    const wordIdToIndex = new Map<string, number>();
    wordIds.forEach((wordId, index) => {
      wordIdToIndex.set(wordId, index);
    });

    const storageHints: main.SpeakerHintStorage[] = [];
    speakerHintIds?.forEach((hintId) => {
      const hint = store.getRow("speaker_hints", hintId) as main.SpeakerHintStorage | undefined;
      if (hint) {
        storageHints.push(hint);
      }
    });

    return convertStorageHintsToRuntime(storageHints, wordIdToIndex);
  }, [store, wordIds, speakerHintIds]);
}

function useTranscriptOffset(transcriptId: string): number {
  const transcriptStartedAt = main.UI.useCell(
    "transcripts",
    transcriptId,
    "started_at",
    main.STORE_ID,
  );

  const sessionId = main.UI.useCell(
    "transcripts",
    transcriptId,
    "session_id",
    main.STORE_ID,
  );

  const transcriptIds = main.UI.useSliceRowIds(
    main.INDEXES.transcriptBySession,
    sessionId ?? "",
    main.STORE_ID,
  );

  const firstTranscriptId = transcriptIds?.[0];
  const firstTranscriptStartedAt = main.UI.useCell(
    "transcripts",
    firstTranscriptId ?? "",
    "started_at",
    main.STORE_ID,
  );

  return (transcriptStartedAt && firstTranscriptStartedAt)
    ? new Date(transcriptStartedAt).getTime() - new Date(firstTranscriptStartedAt).getTime()
    : 0;
}

function useScrollToBottom(deps: DependencyList) {
  const containerRef = useAutoScroll<HTMLDivElement>(deps);
  const [isAtBottom, setIsAtBottom] = useState(true);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    const handleScroll = () => {
      const threshold = 100;
      const isNearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < threshold;
      setIsAtBottom(isNearBottom);
    };

    element.addEventListener("scroll", handleScroll);
    return () => element.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToBottom = () => {
    const element = containerRef.current;
    if (!element) {
      return;
    }
    element.scrollTo({ top: element.scrollHeight, behavior: "smooth" });
  };

  return { containerRef, isAtBottom, scrollToBottom };
}

function useAutoScroll<T extends HTMLElement>(deps: DependencyList) {
  const ref = useRef<T | null>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    const isAtTop = element.scrollTop === 0;
    const isNearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 400;

    if (isAtTop || isNearBottom) {
      element.scrollTop = element.scrollHeight;
    }
  }, deps);

  return ref;
}

function getWordHighlightState(
  {
    editable,
    audioExists,
    currentMs,
    wordStartMs,
    wordEndMs,
  }: {
    editable: boolean;
    audioExists: boolean;
    currentMs: number;
    wordStartMs: number;
    wordEndMs: number;
  },
): "current" | "buffer" | "none" {
  if (!editable || !audioExists) {
    return "none";
  }

  const isCurrentWord = currentMs >= wordStartMs && currentMs <= wordEndMs;
  if (isCurrentWord) {
    return "current";
  }

  const buffer = 300;
  const distanceBefore = wordStartMs - currentMs;
  const distanceAfter = currentMs - wordEndMs;
  const isInBuffer = (distanceBefore <= buffer && distanceBefore > 0)
    || (distanceAfter <= buffer && distanceAfter > 0);

  return isInBuffer ? "buffer" : "none";
}
