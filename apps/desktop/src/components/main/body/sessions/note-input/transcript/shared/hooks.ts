import { DependencyList, RefObject, useEffect, useMemo, useState } from "react";

import * as main from "../../../../../../../store/tinybase/main";
import { RuntimeSpeakerHint } from "../../../../../../../utils/segment";
import { convertStorageHintsToRuntime } from "../../../../../../../utils/speaker-hints";

export function useFinalWords(transcriptId: string): (main.Word & { id: string })[] {
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
  }, [store, wordIds, transcriptId]);
}

export function useFinalSpeakerHints(transcriptId: string): RuntimeSpeakerHint[] {
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
  }, [store, wordIds, speakerHintIds, transcriptId]);
}

export function useTranscriptOffset(transcriptId: string): number {
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

export function useSessionSpeakers(sessionId?: string) {
  const mappingIds = main.UI.useSliceRowIds(
    main.INDEXES.sessionParticipantsBySession,
    sessionId ?? "",
    main.STORE_ID,
  ) as string[];

  if (!sessionId) {
    return undefined;
  }

  return mappingIds.length;
}

export function useScrollDetection(containerRef: RefObject<HTMLDivElement | null>) {
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
  }, [containerRef]);

  const scrollToBottom = () => {
    const element = containerRef.current;
    if (!element) {
      return;
    }
    element.scrollTo({ top: element.scrollHeight, behavior: "smooth" });
  };

  return { isAtBottom, scrollToBottom };
}

export function useAutoScroll(containerRef: RefObject<HTMLElement | null>, deps: DependencyList) {
  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    const raf = requestAnimationFrame(() => {
      const isAtTop = element.scrollTop === 0;
      const isNearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 50;

      if (isAtTop || isNearBottom) {
        element.scrollTop = element.scrollHeight;
      }
    });

    return () => cancelAnimationFrame(raf);
  }, deps);
}
