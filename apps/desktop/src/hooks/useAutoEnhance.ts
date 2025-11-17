import { usePrevious } from "@uidotdev/usehooks";
import { useCallback, useEffect, useRef, useState } from "react";

import { md2json } from "@hypr/tiptap/shared";

import { useListener } from "../contexts/listener";
import * as main from "../store/tinybase/main";
import { createTaskId } from "../store/zustand/ai-task/task-configs";
import { useTabs } from "../store/zustand/tabs";
import type { Tab } from "../store/zustand/tabs/schema";
import { useAITaskTask } from "./useAITaskTask";
import { useCreateEnhancedNote } from "./useEnhancedNotes";
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

  const [autoEnhancedNoteId, setAutoEnhancedNoteId] = useState<string | null>(
    null,
  );

  const startedTasksRef = useRef<Set<string>>(new Set());

  const enhanceTaskId = autoEnhancedNoteId
    ? createTaskId(autoEnhancedNoteId, "enhance")
    : createTaskId("placeholder", "enhance");
  const store = main.UI.useStore(main.STORE_ID);
  const enhanceTask = useAITaskTask(enhanceTaskId, "enhance", {
    onSuccess: ({ text }) => {
      if (text && autoEnhancedNoteId && store) {
        try {
          const jsonContent = md2json(text);
          store.setPartialRow("enhanced_notes", autoEnhancedNoteId, {
            content: JSON.stringify(jsonContent),
          });
        } catch (error) {
          console.error("Failed to convert markdown to JSON:", error);
        }
      }
    },
  });

  const createAndStartEnhance = useCallback(() => {
    if (!model || !hasTranscript) {
      return;
    }

    const enhancedNoteId = createEnhancedNote(sessionId);
    if (!enhancedNoteId) return;

    setAutoEnhancedNoteId(enhancedNoteId);

    updateSessionTabState(tab, {
      editor: { type: "enhanced", id: enhancedNoteId },
    });
  }, [
    hasTranscript,
    model,
    sessionId,
    tab,
    updateSessionTabState,
    createEnhancedNote,
  ]);

  useEffect(() => {
    if (
      autoEnhancedNoteId &&
      model &&
      !startedTasksRef.current.has(autoEnhancedNoteId)
    ) {
      startedTasksRef.current.add(autoEnhancedNoteId);
      void enhanceTask.start({
        model,
        args: { sessionId, enhancedNoteId: autoEnhancedNoteId },
      });
    }
  }, [autoEnhancedNoteId, model, sessionId, enhanceTask.start]);

  useEffect(() => {
    const listenerJustStopped =
      prevListenerStatus === "running_active" &&
      listenerStatus !== "running_active";

    if (listenerJustStopped) {
      createAndStartEnhance();
    }
  }, [listenerStatus, prevListenerStatus, createAndStartEnhance]);
}
