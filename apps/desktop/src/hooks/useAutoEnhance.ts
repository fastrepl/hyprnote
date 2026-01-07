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
import { useCreateEnhancedNote, useEnhancedNotes } from "./useEnhancedNotes";
import { useLanguageModel } from "./useLLMConnection";

export function useAutoEnhance(tab: Extract<Tab, { type: "sessions" }>) {
  const sessionId = tab.id;
  const model = useLanguageModel();
  const { updateSessionTabState } = useTabs();
  const createEnhancedNote = useCreateEnhancedNote();

  const listenerStatus = useListener((state) => state.live.status);
  const prevListenerStatus = usePrevious(listenerStatus);

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

  const existingEnhancedNoteIds = useEnhancedNotes(sessionId);
  const firstExistingEnhancedNoteId = existingEnhancedNoteIds?.[0];

  const [autoEnhancedNoteId, setAutoEnhancedNoteId] = useState<string | null>(
    null,
  );
  const [skipReason, setSkipReason] = useState<string | null>(null);

  const autoEnhanceTriggeredRef = useRef(false);
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
    if (autoEnhanceTriggeredRef.current) {
      return;
    }

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
    autoEnhanceTriggeredRef.current = true;

    if (firstExistingEnhancedNoteId) {
      setAutoEnhancedNoteId(firstExistingEnhancedNoteId);
      updateSessionTabState(tabRef.current, {
        ...tabRef.current.state,
        view: { type: "enhanced", id: firstExistingEnhancedNoteId },
      });
      return;
    }

    const enhancedNoteId = createEnhancedNote(sessionId);
    if (!enhancedNoteId) return;

    setAutoEnhancedNoteId(enhancedNoteId);

    updateSessionTabState(tabRef.current, {
      ...tabRef.current.state,
      view: { type: "enhanced", id: enhancedNoteId },
    });
  }, [
    hasTranscript,
    hasWords,
    wordCount,
    sessionId,
    updateSessionTabState,
    createEnhancedNote,
    firstExistingEnhancedNoteId,
  ]);

  useEffect(() => {
    if (autoEnhancedNoteId && model) {
      void analyticsCommands.event({
        event: "note_enhanced",
        is_auto: true,
      });
      void enhanceTask.start({
        model,
        args: { sessionId, enhancedNoteId: autoEnhancedNoteId },
      });
    }
  }, [autoEnhancedNoteId, model, sessionId, enhanceTask.start]);

  useEffect(() => {
    const listenerJustStarted =
      prevListenerStatus !== "active" && listenerStatus === "active";
    const listenerJustStopped =
      prevListenerStatus === "active" && listenerStatus !== "active";

    if (listenerJustStarted) {
      autoEnhanceTriggeredRef.current = false;
      setAutoEnhancedNoteId(null);
    }

    if (listenerJustStopped) {
      createAndStartEnhance();
    }
  }, [listenerStatus, prevListenerStatus, createAndStartEnhance]);

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
