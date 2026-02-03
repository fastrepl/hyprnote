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
  const titleTask = useAITaskTask(titleTaskId, "title");

  const enhanceTaskId = autoEnhancedNoteId
    ? createTaskId(autoEnhancedNoteId, "enhance")
    : createTaskId("placeholder", "enhance");

  const enhanceTask = useAITaskTask(enhanceTaskId, "enhance");

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

      const capturedStore = store;
      const capturedNoteId = autoEnhancedNoteId;
      const capturedSessionId = sessionId;
      const capturedModel = model;
      const capturedTitleStart = titleTask.start;

      void enhanceTask.start({
        model,
        args: { sessionId, enhancedNoteId: autoEnhancedNoteId },
        onComplete: (text) => {
          if (text && capturedStore && capturedNoteId) {
            try {
              const jsonContent = md2json(text);
              capturedStore.setPartialRow("enhanced_notes", capturedNoteId, {
                content: JSON.stringify(jsonContent),
              });

              const currentTitle = capturedStore.getCell(
                "sessions",
                capturedSessionId,
                "title",
              );
              const trimmedTitle =
                typeof currentTitle === "string" ? currentTitle.trim() : "";
              if (!trimmedTitle && capturedModel) {
                void capturedTitleStart({
                  model: capturedModel,
                  args: { sessionId: capturedSessionId },
                  onComplete: (titleText) => {
                    if (titleText && capturedStore) {
                      const trimmed = titleText.trim();
                      if (trimmed && trimmed !== "<EMPTY>") {
                        capturedStore.setPartialRow(
                          "sessions",
                          capturedSessionId,
                          { title: trimmed },
                        );
                      }
                    }
                  },
                });
              }
            } catch (error) {
              console.error("Failed to convert markdown to JSON:", error);
            }
          }
        },
      });
    }
  }, [
    autoEnhancedNoteId,
    model,
    sessionId,
    store,
    enhanceTask.start,
    titleTask.start,
  ]);

  useEffect(() => {
    const listenerJustBecameInactive =
      (prevListenerStatus === "active" ||
        prevListenerStatus === "finalizing") &&
      listenerStatus === "inactive";
    const wasThisSessionListening = prevLiveSessionId === sessionId;

    if (listenerJustBecameInactive && wasThisSessionListening) {
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
    if (
      listenerStatus === "inactive" &&
      indexes &&
      prevLiveSessionId === sessionId
    ) {
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
    sessionId,
    indexes,
    updateSessionTabState,
    prevLiveSessionId,
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
