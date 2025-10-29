import { usePrevious } from "@uidotdev/usehooks";
import { useEffect } from "react";

import { useAITask } from "../contexts/ai-task";
import * as main from "../store/tinybase/main";
import { createTaskId } from "../store/zustand/ai-task/task-configs";
import { getTaskState } from "../store/zustand/ai-task/tasks";
import type { Tab } from "../store/zustand/tabs/schema";
import { useLanguageModel } from "./useLLMConnection";
import { useTaskStatus } from "./useTaskStatus";

export function useAutoGenerateTitle(tab: Extract<Tab, { type: "sessions" }>) {
  const sessionId = tab.id;
  const model = useLanguageModel();

  const title = main.UI.useCell("sessions", sessionId, "title", main.STORE_ID);
  const enhancedMd = main.UI.useCell("sessions", sessionId, "enhanced_md", main.STORE_ID);
  const prevEnhancedMd = usePrevious(enhancedMd);

  const taskId = createTaskId(sessionId, "title");

  const updateTitle = main.UI.useSetPartialRowCallback(
    "sessions",
    sessionId,
    (input: string) => ({ title: input }),
    [],
    main.STORE_ID,
  );

  const { generate, rawStatus, streamedText, error } = useAITask((state) => {
    const taskState = getTaskState(state.tasks, taskId);
    return {
      generate: state.generate,
      rawStatus: taskState?.status ?? "idle",
      streamedText: taskState?.streamedText ?? "",
      error: taskState?.error,
    };
  });

  const { isGenerating } = useTaskStatus(rawStatus, {
    onSuccess: () => {
      if (streamedText) {
        updateTitle(streamedText);
      }
    },
    onError: () => {
      console.error("Auto-generate title failed:", error?.message || "Unknown error");
    },
  });

  useEffect(() => {
    if (!model || isGenerating) {
      return;
    }

    const hasNewEnhancedContent = enhancedMd && enhancedMd !== prevEnhancedMd;
    const needsTitle = !title;

    if (hasNewEnhancedContent && needsTitle) {
      void generate(taskId, {
        model,
        taskType: "title",
        args: { sessionId },
      });
    }
  }, [enhancedMd, prevEnhancedMd, title, model, isGenerating, generate, taskId, sessionId]);
}
