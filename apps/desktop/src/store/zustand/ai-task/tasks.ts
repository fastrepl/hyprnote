import { Experimental_Agent as Agent, type LanguageModel, stepCountIs } from "ai";
import { create as mutate } from "mutative";
import type { StoreApi } from "zustand";

import type { ToolRegistry } from "../../../contexts/tool-registry/core";
import type { Store as PersistedStore } from "../../tinybase/persisted";
import { applyTransforms } from "./shared/transform_infra";
import { TASK_CONFIGS, type TaskType } from "./task-configs";

export type TasksState = {
  tasks: Record<string, TaskState>;
};

export type TasksActions = {
  generate: (
    taskId: string,
    config: {
      model: LanguageModel;
      taskType: TaskType;
      args?: Record<string, unknown>;
      onComplete?: (text: string) => void;
    },
  ) => Promise<void>;
  cancel: (taskId: string) => void;
  getState: (taskId: string) => TaskState;
};

type StepInfo =
  | { type: "generating" }
  | { type: "tool-call" | "tool-result"; toolName: string };

export type TaskStatus = "idle" | "generating" | "success" | "error";

type TaskState = {
  status: TaskStatus;
  streamedText: string;
  error?: Error;
  abortController: AbortController | null;
  currentStep?: StepInfo;
};

const initialState: TasksState = {
  tasks: {},
};

export const createTasksSlice = <T extends TasksState>(
  set: StoreApi<T>["setState"],
  get: StoreApi<T>["getState"],
  deps: { toolRegistry: ToolRegistry; persistedStore: PersistedStore },
): TasksState & TasksActions => ({
  ...initialState,
  getState: (taskId: string) => {
    const state = get().tasks[taskId];
    return {
      status: state?.status ?? "idle",
      streamedText: state?.streamedText ?? "",
      error: state?.error,
      abortController: state?.abortController ?? null,
      currentStep: state?.currentStep,
    };
  },
  cancel: (taskId: string) => {
    const state = get().tasks[taskId];
    if (state?.abortController) {
      state.abortController.abort();
    }
  },
  generate: async (
    taskId: string,
    config: {
      model: LanguageModel;
      taskType: TaskType;
      args?: Record<string, unknown>;
      onComplete?: (text: string) => void;
    },
  ) => {
    const abortController = new AbortController();
    const taskConfig = TASK_CONFIGS[config.taskType];
    const [system, prompt] = await Promise.all([
      taskConfig.getSystem(config.args, deps.persistedStore),
      taskConfig.getPrompt?.(config.args, deps.persistedStore),
    ]);

    set((state) =>
      mutate(state, (draft) => {
        draft.tasks[taskId] = {
          status: "generating",
          streamedText: "",
          error: undefined,
          abortController,
          currentStep: undefined,
        };
      })
    );

    try {
      const agent = getAgentForTask(config.taskType, config.model, deps);
      const result = agent.stream({ prompt, system });

      let fullText = "";

      const checkAbort = () => {
        if (abortController.signal.aborted) {
          const error = new Error("Aborted");
          error.name = "AbortError";
          throw error;
        }
      };

      const transforms = taskConfig.transforms ?? [];
      const transformedStream = applyTransforms(result.fullStream, transforms, {
        tools: result.toolCalls,
        stopStream: () => abortController.abort(),
      });

      for await (const chunk of transformedStream) {
        checkAbort();

        if (chunk.type === "text-delta") {
          fullText += chunk.text;

          set((state) =>
            mutate(state, (draft) => {
              const currentState = draft.tasks[taskId];
              if (currentState) {
                currentState.streamedText = fullText;
                currentState.currentStep = { type: "generating" };
              }
            })
          );
        } else if (chunk.type === "tool-call") {
          set((state) =>
            mutate(state, (draft) => {
              const currentState = draft.tasks[taskId];
              if (currentState) {
                currentState.currentStep = {
                  type: "tool-call",
                  toolName: chunk.toolName,
                };
              }
            })
          );
        } else if (chunk.type === "tool-result") {
          set((state) =>
            mutate(state, (draft) => {
              const currentState = draft.tasks[taskId];
              if (currentState) {
                currentState.currentStep = {
                  type: "tool-result",
                  toolName: chunk.toolName,
                };
              }
            })
          );
        }
      }

      set((state) =>
        mutate(state, (draft) => {
          draft.tasks[taskId] = {
            status: "success",
            streamedText: fullText,
            error: undefined,
            abortController: null,
            currentStep: undefined,
          };
        })
      );

      config.onComplete?.(fullText);
    } catch (err) {
      if (err instanceof Error && (err.name === "AbortError" || err.message === "Aborted")) {
        set((state) =>
          mutate(state, (draft) => {
            draft.tasks[taskId] = {
              status: "idle",
              streamedText: "",
              error: undefined,
              abortController: null,
              currentStep: undefined,
            };
          })
        );
      } else {
        const error = err instanceof Error ? err : new Error(String(err));
        set((state) =>
          mutate(state, (draft) => {
            draft.tasks[taskId] = {
              status: "error",
              streamedText: "",
              error,
              abortController: null,
              currentStep: undefined,
            };
          })
        );
      }
    }
  },
});

function getAgentForTask(
  taskType: TaskType,
  model: LanguageModel,
  deps: {
    toolRegistry: ToolRegistry;
    persistedStore: PersistedStore;
  },
) {
  const taskConfig = TASK_CONFIGS[taskType];

  if (taskConfig.getAgent) {
    const scopedTools = deps.toolRegistry.getTools("enhancing");
    return taskConfig.getAgent(model, scopedTools);
  }

  return new Agent({
    model,
    stopWhen: stepCountIs(10),
  });
}
