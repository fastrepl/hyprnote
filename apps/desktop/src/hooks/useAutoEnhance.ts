import { usePrevious } from "@uidotdev/usehooks";
import { useCallback, useEffect, useRef, useState } from "react";

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

  // Track the enhanced note ID we create for auto-enhancement
  const [autoEnhancedNoteId, setAutoEnhancedNoteId] = useState<
    string | null
  >(null);

  // Track which IDs we've already started tasks for (prevents infinite retries)
  const startedTasksRef = useRef<Set<string>>(new Set());

  // Set up the task for the auto-enhanced note (only if we have an ID)
  const enhanceTaskId = autoEnhancedNoteId
    ? createTaskId(autoEnhancedNoteId, "enhance")
    : createTaskId("placeholder", "enhance"); // Placeholder to satisfy hook
  const enhanceTask = useAITaskTask(enhanceTaskId, "enhance");

  const createAndStartEnhance = useCallback(() => {
    if (!model || !hasTranscript) {
      return;
    }

    // Create new enhanced note using the hook (avoids duplication)
    const enhancedNoteId = createEnhancedNote(sessionId);
    if (!enhancedNoteId) return;

    // Set the ID so the task hook will pick it up
    setAutoEnhancedNoteId(enhancedNoteId);

    // Switch to the new enhanced tab
    updateSessionTabState(tab, {
      editor: { type: "enhanced", enhancedNoteId },
    });
  }, [
    hasTranscript,
    model,
    sessionId,
    tab,
    updateSessionTabState,
    createEnhancedNote,
  ]);

  // Start the task once the enhanced note ID is set (only once per ID)
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
