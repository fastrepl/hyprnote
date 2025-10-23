import { Experimental_Agent as Agent, type LanguageModel, stepCountIs } from "ai";
import { create as mutate } from "mutative";
import type { StoreApi } from "zustand";

import { createEnhancingAgent } from "../../../contexts/ai-task/enhancing";

export type TaskStatus = "idle" | "generating" | "success" | "error";

export interface StepInfo {
  stepNumber: number;
  type: "tool-call" | "text";
  toolName?: string;
  toolArgs?: unknown;
  toolResult?: unknown;
  text?: string;
}

export interface TaskState {
  status: TaskStatus;
  streamedText: string;
  steps: StepInfo[];
  error?: Error;
  abortController: AbortController | null;
}

export type TasksState = {
  tasks: Map<string, TaskState>;
};

export type TasksActions = {
  generate: (
    taskId: string,
    config: {
      model: LanguageModel;
      prompt: string;
      onComplete?: (text: string) => void;
    },
  ) => Promise<void>;
  cancel: (taskId: string) => void;
  getStatus: (taskId: string) => TaskStatus;
  getState: (taskId: string) => {
    status: TaskStatus;
    streamedText: string;
    steps: StepInfo[];
    error?: Error;
  };
};

const initialState: TasksState = {
  tasks: new Map(),
};

function getAgentForTask(taskId: string, model: LanguageModel) {
  if (taskId.endsWith("-enhance")) {
    return createEnhancingAgent(model);
  }

  return new Agent({
    model,
    stopWhen: stepCountIs(10),
  });
}

export const createTasksSlice = <T extends TasksState>(
  set: StoreApi<T>["setState"],
  get: StoreApi<T>["getState"],
): TasksState & TasksActions => ({
  ...initialState,
  getStatus: (taskId: string): TaskStatus => {
    return get().tasks.get(taskId)?.status ?? "idle";
  },
  getState: (taskId: string) => {
    const state = get().tasks.get(taskId);
    return {
      status: state?.status ?? "idle",
      streamedText: state?.streamedText ?? "",
      steps: state?.steps ?? [],
      error: state?.error,
    };
  },
  cancel: (taskId: string) => {
    const state = get().tasks.get(taskId);
    if (state?.abortController) {
      state.abortController.abort();
    }
  },
  generate: async (
    taskId: string,
    config: {
      model: LanguageModel;
      prompt: string;
      onComplete?: (text: string) => void;
    },
  ) => {
    const abortController = new AbortController();

    set((state) =>
      mutate(state, (draft) => {
        draft.tasks.set(taskId, {
          status: "generating",
          streamedText: "",
          steps: [],
          error: undefined,
          abortController,
        });
      })
    );

    try {
      const agent = getAgentForTask(taskId, config.model);
      const result = agent.stream({ prompt: config.prompt });

      let fullText = "";
      const collectedSteps: StepInfo[] = [];

      const abortHandler = () => {
        const error = new Error("Aborted");
        error.name = "AbortError";
        throw error;
      };

      abortController.signal.addEventListener("abort", abortHandler);

      try {
        for await (const chunk of result.textStream) {
          if (abortController.signal.aborted) {
            throw new Error("Aborted");
          }

          fullText += chunk;

          set((state) =>
            mutate(state, (draft) => {
              const currentState = draft.tasks.get(taskId);
              if (currentState) {
                // TODO
                const firstheader = fullText.indexOf("#");
                const trimmed = fullText.substring(firstheader - 1);
                currentState.streamedText = trimmed;
              }
            })
          );
        }

        const steps = await result.steps;

        steps.forEach((step: any, index: number) => {
          if (step.toolCalls && step.toolCalls.length > 0) {
            step.toolCalls.forEach((toolCall: any) => {
              const toolResult = step.toolResults?.find(
                (tr: any) => tr.toolCallId === toolCall.toolCallId,
              );

              collectedSteps.push({
                stepNumber: index + 1,
                type: "tool-call",
                toolName: toolCall.toolName,
                toolArgs: toolCall.args,
                toolResult: toolResult?.result,
              });
            });
          }

          if (step.text) {
            collectedSteps.push({
              stepNumber: index + 1,
              type: "text",
              text: step.text,
            });
          }
        });

        set((state) =>
          mutate(state, (draft) => {
            draft.tasks.set(taskId, {
              status: "success",
              streamedText: fullText,
              steps: collectedSteps,
              error: undefined,
              abortController: null,
            });
          })
        );

        config.onComplete?.(fullText);
      } finally {
        abortController.signal.removeEventListener("abort", abortHandler);
      }
    } catch (err) {
      if (err instanceof Error && (err.name === "AbortError" || err.message === "Aborted")) {
        set((state) =>
          mutate(state, (draft) => {
            draft.tasks.set(taskId, {
              status: "idle",
              streamedText: "",
              steps: [],
              error: undefined,
              abortController: null,
            });
          })
        );
      } else {
        const error = err instanceof Error ? err : new Error(String(err));
        set((state) =>
          mutate(state, (draft) => {
            draft.tasks.set(taskId, {
              status: "error",
              streamedText: "",
              steps: [],
              error,
              abortController: null,
            });
          })
        );
      }
    }
  },
});
