import { usePrevious } from "@uidotdev/usehooks";
import { useEffect, useRef, useState } from "react";

import { useListener } from "../contexts/listener";
import * as main from "../store/tinybase/store/main";
import { useTabs } from "../store/zustand/tabs";
import type { Tab } from "../store/zustand/tabs/schema";

const MIN_WORDS_FOR_ENHANCEMENT = 5;

export function useAutoEnhance(tab: Extract<Tab, { type: "sessions" }>) {
  const sessionId = tab.id;
  const { updateSessionTabState } = useTabs();

  const listenerStatus = useListener((state) => state.live.status);
  const prevListenerStatus = usePrevious(listenerStatus);
  const liveSessionId = useListener((state) => state.live.sessionId);
  const prevLiveSessionId = usePrevious(liveSessionId);

  const indexes = main.UI.useIndexes(main.STORE_ID);
  const store = main.UI.useStore(main.STORE_ID);

  const transcriptIds = main.UI.useSliceRowIds(
    main.INDEXES.transcriptBySession,
    sessionId,
    main.STORE_ID,
  );
  const hasTranscript = !!transcriptIds && transcriptIds.length > 0;
  const firstTranscriptId = transcriptIds?.[0];

  const wordsJson = main.UI.useCell(
    "transcripts",
    firstTranscriptId ?? "",
    "words",
    main.STORE_ID,
  ) as string | undefined;
  const wordCount = wordsJson ? (JSON.parse(wordsJson) as unknown[]).length : 0;
  const hasWords = wordCount >= MIN_WORDS_FOR_ENHANCEMENT;

  const [skipReason, setSkipReason] = useState<string | null>(null);

  const tabRef = useRef(tab);
  tabRef.current = tab;

  useEffect(() => {
    const listenerJustStopped =
      prevListenerStatus === "active" && listenerStatus !== "active";
    const wasThisSessionListening = prevLiveSessionId === sessionId;

    if (listenerJustStopped && wasThisSessionListening) {
      if (!hasTranscript) {
        setSkipReason("No transcript recorded");
        return;
      }

      if (!hasWords) {
        setSkipReason(
          `Not enough words recorded (${wordCount}/${MIN_WORDS_FOR_ENHANCEMENT} minimum)`,
        );
        return;
      }

      setSkipReason(null);
    }
  }, [
    listenerStatus,
    prevListenerStatus,
    prevLiveSessionId,
    sessionId,
    hasTranscript,
    hasWords,
    wordCount,
  ]);

  useEffect(() => {
    if (listenerStatus === "finalizing" && indexes) {
      const enhancedNoteIds = indexes.getSliceRowIds(
        main.INDEXES.enhancedNotesBySession,
        sessionId,
      );
      const firstEnhancedNoteId = enhancedNoteIds?.[0];

      if (firstEnhancedNoteId) {
        updateSessionTabState(tabRef.current, {
          ...tabRef.current.state,
          view: { type: "enhanced", id: firstEnhancedNoteId },
        });
      }
    }
  }, [listenerStatus, sessionId, indexes, updateSessionTabState]);

  useEffect(() => {
    const listenerJustStopped =
      prevListenerStatus === "active" && listenerStatus !== "active";
    const wasThisSessionListening = prevLiveSessionId === sessionId;

    if (listenerJustStopped && wasThisSessionListening && indexes && store) {
      const enhancedNoteIds = indexes.getSliceRowIds(
        main.INDEXES.enhancedNotesBySession,
        sessionId,
      );
      const firstEnhancedNoteId = enhancedNoteIds?.[0];

      if (firstEnhancedNoteId) {
        updateSessionTabState(tabRef.current, {
          ...tabRef.current.state,
          view: { type: "enhanced", id: firstEnhancedNoteId },
        });
      }
    }
  }, [
    listenerStatus,
    prevListenerStatus,
    prevLiveSessionId,
    sessionId,
    indexes,
    store,
    updateSessionTabState,
  ]);

  useEffect(() => {
    if (skipReason) {
      const timer = setTimeout(() => {
        setSkipReason(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [skipReason]);

  return { skipReason };
}
