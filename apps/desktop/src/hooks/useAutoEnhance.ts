import { usePrevious } from "@uidotdev/usehooks";
import { useCallback, useEffect, useRef, useState } from "react";

import { commands as analyticsCommands } from "@hypr/plugin-analytics";
import { md2json } from "@hypr/tiptap/shared";

import { useListener } from "../contexts/listener";
import * as main from "../store/tinybase/store/main";
import { createTaskId } from "../store/zustand/ai-task/task-configs";
import { useTabs } from "../store/zustand/tabs";
import type { Tab } from "../store/zustand/tabs/schema";
import { useAITaskTask } from "./useAITaskTask";
import { useCreateEnhancedNote } from "./useEnhancedNotes";
import { useLanguageModel, useLLMConnection } from "./useLLMConnection";

export function useAutoEnhance(tab: Extract<Tab, { type: "sessions" }>) {
  const sessionId = tab.id;
  const model = useLanguageModel();
  const { conn: llmConn } = useLLMConnection();
  const { updateSessionTabState } = useTabs();
  const createEnhancedNote = useCreateEnhancedNote();

  const listenerStatus = useListener((state) => state.live.status);
  const prevListenerStatus = usePrevious(listenerStatus);
  const liveSessionId = useListener((state) => state.live.sessionId);
  const prevLiveSessionId = usePrevious(liveSessionId);

  const indexes = main.UI.useIndexes(main.STORE_ID);

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
  const MIN_WORDS_FOR_ENHANCEMENT = 5;
  const hasWords = wordCount >= MIN_WORDS_FOR_ENHANCEMENT;

  const [autoEnhancedNoteId, setAutoEnhancedNoteId] = useState<string | null>(
    null,
  );
  const [skipReason, setSkipReason] = useState<string | null>(null);

  const startedTasksRef = useRef<Set<string>>(new Set());
  const tabRef = useRef(tab);
  tabRef.current = tab;

  const store = main.UI.useStore(main.STORE_ID);

  const titleTaskId = createTaskId(sessionId, "title");
  const handleTitleSuccess = useCallback(
    ({ text }: { text: string }) => {
      if (text && store) {
        const trimmedTitle = text.trim();
        if (!trimmedTitle || trimmedTitle === "<EMPTY>") {
          setSkipReason("Could not generate a meaningful title");
          return;
        }
        store.setPartialRow("sessions", sessionId, {
          title: trimmedTitle,
        });
      }
    },
    [store, sessionId],
  );
  const titleTask = useAITaskTask(titleTaskId, "title", {
    onSuccess: handleTitleSuccess,
  });

  const enhanceTaskId = autoEnhancedNoteId
    ? createTaskId(autoEnhancedNoteId, "enhance")
    : createTaskId("placeholder", "enhance");

  const handleEnhanceSuccess = useCallback(
    ({ text }: { text: string }) => {
      if (text && autoEnhancedNoteId && store) {
        try {
          const jsonContent = md2json(text);
          store.setPartialRow("enhanced_notes", autoEnhancedNoteId, {
            content: JSON.stringify(jsonContent),
          });

          const currentTitle = store.getCell("sessions", sessionId, "title");
          const trimmedTitle =
            typeof currentTitle === "string" ? currentTitle.trim() : "";
          if (!trimmedTitle && model) {
            void titleTask.start({
              model,
              args: { sessionId },
            });
          }
        } catch (error) {
          console.error("Failed to convert markdown to JSON:", error);
        }
      }
    },
    [autoEnhancedNoteId, store, sessionId, model, titleTask.start],
  );

  const enhanceTask = useAITaskTask(enhanceTaskId, "enhance", {
    onSuccess: handleEnhanceSuccess,
  });

  const createAndStartEnhance = useCallback(() => {
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

    const enhancedNoteId = createEnhancedNote(sessionId);
    if (!enhancedNoteId) return;

    updateSessionTabState(tabRef.current, {
      ...tabRef.current.state,
      view: { type: "enhanced", id: enhancedNoteId },
    });

    setAutoEnhancedNoteId(enhancedNoteId);
  }, [
    hasTranscript,
    hasWords,
    wordCount,
    sessionId,
    updateSessionTabState,
    createEnhancedNote,
  ]);

  useEffect(() => {
    if (autoEnhancedNoteId && model) {
      if (!startedTasksRef.current.has(autoEnhancedNoteId)) {
        startedTasksRef.current.add(autoEnhancedNoteId);
        void analyticsCommands.event({
          event: "note_enhanced",
          is_auto: true,
          llm_provider: llmConn?.providerId,
          llm_model: llmConn?.modelId,
        });
      }
      void enhanceTask.start({
        model,
        args: { sessionId, enhancedNoteId: autoEnhancedNoteId },
      });
    }
  }, [autoEnhancedNoteId, model, sessionId, enhanceTask.start]);

  useEffect(() => {
    const listenerJustStopped =
      prevListenerStatus === "active" && listenerStatus !== "active";
    const wasThisSessionListening = prevLiveSessionId === sessionId;

    if (listenerJustStopped && wasThisSessionListening) {
      createAndStartEnhance();
    }
  }, [
    listenerStatus,
    prevListenerStatus,
    prevLiveSessionId,
    sessionId,
    createAndStartEnhance,
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
    if (skipReason) {
      const timer = setTimeout(() => {
        setSkipReason(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [skipReason]);

  return { skipReason };
}
