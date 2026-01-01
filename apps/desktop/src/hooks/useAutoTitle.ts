import { usePrevious } from "@uidotdev/usehooks";
import { useCallback, useEffect, useRef } from "react";

import * as main from "../store/tinybase/store/main";
import { createTaskId } from "../store/zustand/ai-task/task-configs";
import type { Tab } from "../store/zustand/tabs";
import { useAITaskTask } from "./useAITaskTask";
import { useLanguageModel } from "./useLLMConnection";

export function useAutoTitle(tab: Extract<Tab, { type: "sessions" }>) {
  const sessionId = tab.id;
  const model = useLanguageModel();

  const title = main.UI.useCell("sessions", sessionId, "title", main.STORE_ID);

  const enhancedNoteIds = main.UI.useSliceRowIds(
    main.INDEXES.enhancedNotesBySession,
    sessionId,
    main.STORE_ID,
  );
  const firstEnhancedNoteId = enhancedNoteIds?.[0];

  const enhancedNoteContent = main.UI.useCell(
    "enhanced_notes",
    firstEnhancedNoteId ?? "",
    "content",
    main.STORE_ID,
  );
  const prevEnhancedNoteContent = usePrevious(enhancedNoteContent);

  const titleTaskId = createTaskId(sessionId, "title");

  const updateTitle = main.UI.useSetPartialRowCallback(
    "sessions",
    sessionId,
    (input: string) => ({ title: input }),
    [],
    main.STORE_ID,
  );

  const titleTask = useAITaskTask(titleTaskId, "title", {
    onSuccess: ({ text }) => {
      if (text) {
        updateTitle(text);
      }
    },
  });

  const attemptGenerateTitle = useCallback(() => {
    const trimmedTitle = title?.trim();
    if (trimmedTitle) {
      return;
    }

    if (!model) {
      return;
    }

    void titleTask.start({
      model,
      args: { sessionId },
    });
  }, [title, model, titleTask, sessionId]);

  const hasGeneratedForContentRef = useRef<string | null>(null);

  useEffect(() => {
    const hasContent =
      enhancedNoteContent &&
      typeof enhancedNoteContent === "string" &&
      enhancedNoteContent.length > 0;

    const contentChanged =
      prevEnhancedNoteContent !== undefined &&
      enhancedNoteContent !== prevEnhancedNoteContent;

    if (
      hasContent &&
      contentChanged &&
      hasGeneratedForContentRef.current !== enhancedNoteContent
    ) {
      hasGeneratedForContentRef.current = enhancedNoteContent as string;
      attemptGenerateTitle();
    }
  }, [enhancedNoteContent, prevEnhancedNoteContent, attemptGenerateTitle]);

  return {
    isGenerating: titleTask.isGenerating,
  };
}
