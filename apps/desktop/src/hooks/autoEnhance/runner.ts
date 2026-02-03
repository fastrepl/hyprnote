import { useCallback, useRef } from "react";

import { commands as analyticsCommands } from "@hypr/plugin-analytics";
import { md2json } from "@hypr/tiptap/shared";

import * as main from "../../store/tinybase/store/main";
import { createTaskId } from "../../store/zustand/ai-task/task-configs";
import { useTabs } from "../../store/zustand/tabs";
import type { Tab } from "../../store/zustand/tabs/schema";
import { useAITaskTask } from "../useAITaskTask";
import { useCreateEnhancedNote } from "../useEnhancedNotes";
import { useLanguageModel, useLLMConnection } from "../useLLMConnection";
import { getEligibility } from "./eligibility";

type RunResult =
  | { type: "started"; noteId: string }
  | { type: "skipped"; reason: string }
  | { type: "no_model" };

export function useAutoEnhanceRunner(
  tab: Extract<Tab, { type: "sessions" }>,
  transcriptIds: string[],
  hasTranscript: boolean,
): {
  run: () => RunResult;
  isEnhancing: boolean;
} {
  const sessionId = tab.id;
  const model = useLanguageModel();
  const { conn: llmConn } = useLLMConnection();
  const { updateSessionTabState } = useTabs();
  const createEnhancedNote = useCreateEnhancedNote();

  const store = main.UI.useStore(main.STORE_ID) as main.Store | undefined;

  const startedTasksRef = useRef<Set<string>>(new Set());
  const currentNoteIdRef = useRef<string | null>(null);
  const tabRef = useRef(tab);
  tabRef.current = tab;

  const enhanceTaskId = currentNoteIdRef.current
    ? createTaskId(currentNoteIdRef.current, "enhance")
    : null;

  const titleTaskId = createTaskId(sessionId, "title");

  const handleTitleSuccess = useCallback(
    ({ text }: { text: string }) => {
      if (text && store) {
        const trimmed = text.trim();
        if (trimmed && trimmed !== "<EMPTY>") {
          store.setPartialRow("sessions", sessionId, { title: trimmed });
        }
      }
    },
    [store, sessionId],
  );

  const titleTask = useAITaskTask(titleTaskId, "title", {
    onSuccess: handleTitleSuccess,
  });

  const handleEnhanceSuccess = useCallback(
    ({ text }: { text: string }) => {
      const noteId = currentNoteIdRef.current;
      if (!text || !store || !noteId) return;

      try {
        const jsonContent = md2json(text);
        store.setPartialRow("enhanced_notes", noteId, {
          content: JSON.stringify(jsonContent),
        });

        const currentTitle = store.getCell("sessions", sessionId, "title");
        const trimmedTitle =
          typeof currentTitle === "string" ? currentTitle.trim() : "";

        if (!trimmedTitle && model) {
          void titleTask.start({ model, args: { sessionId } });
        }
      } catch (error) {
        console.error("Failed to convert markdown to JSON:", error);
      }
    },
    [store, sessionId, model, titleTask.start],
  );

  const enhanceTask = useAITaskTask(enhanceTaskId, "enhance", {
    onSuccess: handleEnhanceSuccess,
  });

  const run = useCallback((): RunResult => {
    const eligibility = getEligibility(hasTranscript, transcriptIds, store);

    if (!eligibility.eligible) {
      return { type: "skipped", reason: eligibility.reason };
    }

    if (!model) {
      return { type: "no_model" };
    }

    const enhancedNoteId = createEnhancedNote(sessionId);
    if (!enhancedNoteId) {
      return { type: "skipped", reason: "Failed to create note" };
    }

    currentNoteIdRef.current = enhancedNoteId;

    updateSessionTabState(tabRef.current, {
      ...tabRef.current.state,
      view: { type: "enhanced", id: enhancedNoteId },
    });

    if (!startedTasksRef.current.has(enhancedNoteId)) {
      startedTasksRef.current.add(enhancedNoteId);
      void analyticsCommands.event({
        event: "note_enhanced",
        is_auto: true,
        llm_provider: llmConn?.providerId,
        llm_model: llmConn?.modelId,
      });
    }

    void enhanceTask.start({
      model,
      args: { sessionId, enhancedNoteId },
    });

    return { type: "started", noteId: enhancedNoteId };
  }, [
    hasTranscript,
    transcriptIds,
    store,
    model,
    sessionId,
    createEnhancedNote,
    updateSessionTabState,
    llmConn,
    enhanceTask.start,
  ]);

  return {
    run,
    isEnhancing: enhanceTask.isGenerating,
  };
}
