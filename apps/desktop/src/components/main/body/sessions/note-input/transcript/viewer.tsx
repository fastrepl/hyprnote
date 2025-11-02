import { useQuery } from "@tanstack/react-query";
import { DependencyList, Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { commands as miscCommands } from "@hypr/plugin-misc";
import { cn } from "@hypr/utils";
import { useAudioPlayer } from "../../../../../../contexts/audio-player/provider";
import { useListener } from "../../../../../../contexts/listener";
import * as main from "../../../../../../store/tinybase/main";
import { buildSegments, PartialWord, Segment, SpeakerHint } from "../../../../../../utils/segment";
import { parseProviderSpeakerIndex } from "../../../../../../utils/speaker-hints";
import { SegmentHeader } from "./segment-header";

export function TranscriptViewer({ sessionId }: { sessionId: string }) {
  const transcriptIds = main.UI.useSliceRowIds(
    main.INDEXES.transcriptBySession,
    sessionId,
    main.STORE_ID,
  );

  const active = useListener((state) => state.status !== "inactive" && state.sessionId === sessionId);
  const partialWords = useListener((state) => Object.values(state.partialWordsByChannel).flat());
  const partialHints = useListener((state) => state.partialHints);

  const audioExists = useQuery({
    queryKey: ["audio", sessionId, "exist"],
    queryFn: () => miscCommands.audioExist(sessionId),
    select: (result) => {
      if (result.status === "error") {
        throw new Error(result.error);
      }
      return result.data;
    },
  });

  const { containerRef, isAtBottom, scrollToBottom } = useScrollToBottom([transcriptIds]);

  if (transcriptIds.length === 0) {
    return null;
  }

  return (
    <div className="relative h-full">
      <div
        ref={containerRef}
        className={cn([
          "space-y-8 h-full overflow-y-auto overflow-x-hidden",
          "px-0.5 pb-16 scroll-pb-[8rem]",
          true ? "scrollbar-none" : "scroll-pb-[4rem]",
        ])}
      >
        {transcriptIds.map(
          (transcriptId, index) => (
            <Fragment key={transcriptId}>
              <RenderTranscript
                transcriptId={transcriptId}
                partialWords={(index === transcriptIds.length - 1) ? partialWords : []}
                partialHints={(index === transcriptIds.length - 1) ? partialHints : []}
                active={active}
                audioExists={audioExists.data ?? false}
              />
              {index < transcriptIds.length - 1 && <TranscriptSeparator />}
            </Fragment>
          ),
        )}
      </div>

      {(!isAtBottom && active) && (
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
      <span>Restarted</span>
      <div className="flex-1 border-t border-neutral-200/40" />
    </div>
  );
}

function RenderTranscript(
  {
    transcriptId,
    partialWords,
    partialHints,
    active,
    audioExists,
  }: {
    transcriptId: string;
    partialWords: PartialWord[];
    partialHints: SpeakerHint[];
    active: boolean;
    audioExists: boolean;
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
          <RenderSegment
            key={i}
            segment={segment}
            offsetMs={offsetMs}
            active={active}
            audioExists={audioExists}
          />
        ),
      )}
    </>
  );
}

function RenderSegment(
  { segment, offsetMs, active, audioExists }: {
    segment: Segment;
    offsetMs: number;
    active: boolean;
    audioExists: boolean;
  },
) {
  const { time, seek } = useAudioPlayer();
  const currentMs = time.current * 1000;

  const timestamp = useMemo(() => {
    if (segment.words.length === 0) {
      return "00:00 - 00:00";
    }

    const firstWord = segment.words[0];
    const lastWord = segment.words[segment.words.length - 1];

    const [from, to] = [firstWord.start_ms, lastWord.end_ms].map(formatTimestamp);
    return `${from} - ${to}`;
  }, [segment.words.length]);

  return (
    <section>
      <SegmentHeader segmentKey={segment.key} timestamp={timestamp} />

      <div className="mt-1.5 text-sm leading-relaxed break-words overflow-wrap-anywhere">
        {segment.words.map((word, idx) => {
          const wordStartMs = offsetMs + word.start_ms;
          const wordEndMs = offsetMs + word.end_ms;

          const highlightState = getWordHighlightState({
            active,
            audioExists,
            currentMs,
            wordStartMs,
            wordEndMs,
          });

          return (
            <span
              key={`${word.start_ms}-${idx}`}
              onClick={audioExists ? () => seek((offsetMs + word.start_ms) / 1000) : undefined}
              className={cn([
                audioExists && "cursor-pointer",
                audioExists && highlightState === "none" && "hover:bg-neutral-200/60",
                !word.isFinal && ["opacity-60", "italic"],
                highlightState === "current" && "bg-blue-200/70",
                highlightState === "buffer" && "bg-blue-200/30",
              ])}
            >
              {word.text}
            </span>
          );
        })}
      </div>
    </section>
  );
}

function useFinalWords(transcriptId: string): main.Word[] {
  const store = main.UI.useStore(main.STORE_ID);
  const wordIds = main.UI.useSliceRowIds(main.INDEXES.wordsByTranscript, transcriptId, main.STORE_ID);

  return useMemo(() => {
    if (!store) {
      return [];
    }

    const words: main.Word[] = [];
    wordIds?.forEach((wordId) => {
      const word = store.getRow("words", wordId);
      if (word) {
        words.push(word as main.Word);
      }
    });
    return words;
  }, [store, wordIds]);
}

function useFinalSpeakerHints(transcriptId: string): SpeakerHint[] {
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

    const hints: SpeakerHint[] = [];
    speakerHintIds?.forEach((hintId) => {
      const hint = store.getRow("speaker_hints", hintId) as main.SpeakerHintStorage | undefined;
      if (!hint || hint.type !== "provider_speaker_index") {
        return;
      }

      const parsed = parseProviderSpeakerIndex(hint.value);
      if (parsed && typeof hint.word_id === "string") {
        const wordIndex = wordIdToIndex.get(hint.word_id);
        if (typeof wordIndex === "number") {
          hints.push({
            wordIndex,
            speakerIndex: parsed.speaker_index,
          });
        }
      }
    });

    return hints;
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
    const isNearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 200;

    if (isAtTop || isNearBottom) {
      element.scrollTop = element.scrollHeight;
    }
  }, deps);

  return ref;
}

function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }

  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function getWordHighlightState(
  {
    active,
    audioExists,
    currentMs,
    wordStartMs,
    wordEndMs,
  }: {
    active: boolean;
    audioExists: boolean;
    currentMs: number;
    wordStartMs: number;
    wordEndMs: number;
  },
): "current" | "buffer" | "none" {
  if (active || !audioExists) {
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
