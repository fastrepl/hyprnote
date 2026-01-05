import { useCallback } from "react";

import * as main from "../store/tinybase/store/main";
import { createTaskId } from "../store/zustand/ai-task/task-configs";
import type { Tab } from "../store/zustand/tabs";
import { useAITaskTask } from "./useAITaskTask";
import { useLanguageModel } from "./useLLMConnection";

export function useAutoTitle(tab: Extract<Tab, { type: "sessions" }>) {
  const sessionId = tab.id;
  const model = useLanguageModel();

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

  const generateTitle = useCallback(() => {
    if (!model) {
      return;
    }

    void titleTask.start({
      model,
      args: { sessionId },
    });
  }, [model, titleTask.start, sessionId]);

  return {
    isGenerating: titleTask.isGenerating,
    generateTitle,
  };
}
