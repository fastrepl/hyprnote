import { usePrevious } from "@uidotdev/usehooks";
import { useMachine } from "@xstate/react";
import { useEffect } from "react";
import { setup } from "xstate";

import { useAITask } from "../contexts/ai-task";
import { useListener } from "../contexts/listener";
import * as main from "../store/tinybase/main";
import { createTaskId } from "../store/zustand/ai-task/task-configs";
import { getTaskState } from "../store/zustand/ai-task/tasks";
import { useTabs } from "../store/zustand/tabs";
import type { Tab } from "../store/zustand/tabs/schema";
import { useLanguageModel } from "./useLLMConnection";
import { useTaskStatus } from "./useTaskStatus";

type Context = Record<string, never>;

type Events =
  | { type: "LISTENER_STOPPED" }
  | { type: "LISTENER_STARTED" }
  | { type: "ENHANCE_SUCCESS" }
  | { type: "ENHANCE_ERROR" }
  | { type: "TITLE_SUCCESS" }
  | { type: "TITLE_ERROR" }
  | { type: "RETRY" };

const autoEnhanceMachine = setup({
  types: {
    context: {} as Context,
    events: {} as Events,
  },
  delays: {
    debounceDelay: 500,
  },
}).createMachine({
  id: "autoEnhance",
  initial: "idle",
  context: {},
  states: {
    idle: {
      on: {
        LISTENER_STOPPED: {
          target: "debouncing",
        },
      },
    },
    debouncing: {
      after: {
        debounceDelay: "readyToGenerate",
      },
      on: {
        LISTENER_STARTED: {
          target: "idle",
        },
      },
    },
    readyToGenerate: {
      always: {
        target: "enhancing",
      },
    },
    enhancing: {
      on: {
        ENHANCE_SUCCESS: {
          target: "generatingTitle",
        },
        ENHANCE_ERROR: {
          target: "error",
        },
      },
    },
    generatingTitle: {
      on: {
        TITLE_SUCCESS: {
          target: "success",
        },
        TITLE_ERROR: {
          target: "success",
        },
      },
    },
    success: {
      on: {
        LISTENER_STOPPED: {
          target: "debouncing",
        },
      },
    },
    error: {
      on: {
        RETRY: {
          target: "enhancing",
        },
        LISTENER_STOPPED: {
          target: "debouncing",
        },
      },
    },
  },
});

export function useAutoEnhance(tab: Extract<Tab, { type: "sessions" }>) {
  const sessionId = tab.id;
  const model = useLanguageModel();
  const { updateSessionTabState } = useTabs();

  const listenerStatus = useListener((state) => state.status);

  const transcriptIds = main.UI.useSliceRowIds(
    main.INDEXES.transcriptBySession,
    sessionId,
    main.STORE_ID,
  );
  const hasTranscript = !!transcriptIds && transcriptIds.length > 0;

  const title = main.UI.useCell("sessions", sessionId, "title", main.STORE_ID);

  const enhanceTaskId = createTaskId(sessionId, "enhance");
  const titleTaskId = createTaskId(sessionId, "title");

  const updateEnhancedMd = main.UI.useSetPartialRowCallback(
    "sessions",
    sessionId,
    (input: string) => ({ enhanced_md: input }),
    [],
    main.STORE_ID,
  );

  const updateTitle = main.UI.useSetPartialRowCallback(
    "sessions",
    sessionId,
    (input: string) => ({ title: input }),
    [],
    main.STORE_ID,
  );

  const { generate, rawStatus: enhanceStatus, streamedText: enhanceText, error: enhanceError } = useAITask((state) => {
    const taskState = getTaskState(state.tasks, enhanceTaskId);
    return {
      generate: state.generate,
      rawStatus: taskState?.status ?? "idle",
      streamedText: taskState?.streamedText ?? "",
      error: taskState?.error,
    };
  });

  const { rawStatus: titleStatus, streamedText: titleText, error: titleError } = useAITask((state) => {
    const taskState = getTaskState(state.tasks, titleTaskId);
    return {
      rawStatus: taskState?.status ?? "idle",
      streamedText: taskState?.streamedText ?? "",
      error: taskState?.error,
    };
  });

  const [state, send] = useMachine(autoEnhanceMachine);

  const prevListenerStatus = usePrevious(listenerStatus);

  useEffect(() => {
    if (prevListenerStatus === "running_active" && listenerStatus !== "running_active") {
      send({ type: "LISTENER_STOPPED" });
    } else if (prevListenerStatus !== "running_active" && listenerStatus === "running_active") {
      send({ type: "LISTENER_STARTED" });
    }
  }, [listenerStatus, prevListenerStatus, send]);

  useEffect(() => {
    if (state.value === "enhancing" && enhanceStatus === "idle") {
      if (!model) {
        console.log("[AutoEnhance] Skip: No language model available");
        send({ type: "ENHANCE_ERROR" });
        return;
      }

      if (!hasTranscript) {
        console.log("[AutoEnhance] Skip: No transcript available after stopping");
        send({ type: "ENHANCE_ERROR" });
        return;
      }

      void generate(enhanceTaskId, {
        model,
        taskType: "enhance",
        args: { sessionId },
      });
    }
  }, [state.value, enhanceStatus, model, hasTranscript, generate, enhanceTaskId, sessionId, send]);

  useEffect(() => {
    if (state.value === "generatingTitle" && titleStatus === "idle") {
      if (!model) {
        console.log("[AutoGenerateTitle] Skip: No language model available");
        send({ type: "TITLE_ERROR" });
        return;
      }

      if (title) {
        console.log("[AutoGenerateTitle] Skip: Title already exists");
        send({ type: "TITLE_SUCCESS" });
        return;
      }

      void generate(titleTaskId, {
        model,
        taskType: "title",
        args: { sessionId },
      });
    }
  }, [state.value, titleStatus, model, title, generate, titleTaskId, sessionId, send]);

  useTaskStatus(enhanceStatus, {
    onSuccess: () => {
      if (enhanceText) {
        updateEnhancedMd(enhanceText);
        updateSessionTabState(tab, { editor: "enhanced" });
      }
      send({ type: "ENHANCE_SUCCESS" });
    },
    onError: () => {
      if (state.value === "enhancing") {
        console.error("Auto-enhance failed:", enhanceError?.message || "Unknown error");
      }
      send({ type: "ENHANCE_ERROR" });
    },
  });

  useTaskStatus(titleStatus, {
    onSuccess: () => {
      if (titleText) {
        updateTitle(titleText);
      }
      send({ type: "TITLE_SUCCESS" });
    },
    onError: () => {
      if (state.value === "generatingTitle") {
        console.error("Auto-generate title failed:", titleError?.message || "Unknown error");
      }
      send({ type: "TITLE_ERROR" });
    },
  });
}
