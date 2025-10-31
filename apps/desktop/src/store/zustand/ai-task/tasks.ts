import type { LanguageModel } from "ai";
import { create as mutate } from "mutative";
import type { StoreApi } from "zustand";

import type { ToolRegistry } from "../../../contexts/tool-registry/core";
import type { Store as PersistedStore } from "../../tinybase/main";
import { applyTransforms } from "./shared/transform_infra";
import { TASK_CONFIGS, type TaskArgsMap, type TaskId, type TaskType, type ToolNamesByTask } from "./task-configs";

export type TasksState = {
  tasks: Record<string, TaskState>;
};

export type TasksActions = {
  generate: <T extends TaskType>(
    taskId: TaskId<T>,
    config: {
      model: LanguageModel;
      taskType: T;
      args: TaskArgsMap[T];
      onComplete?: (text: string) => void;
    },
  ) => Promise<void>;
  cancel: (taskId: string) => void;
  getState: <T extends TaskType>(taskId: TaskId<T>) => TaskState<T> | undefined;
};

export type TaskStepInfo<T extends TaskType = TaskType> =
  | { type: "generating" }
  | (ToolNamesByTask[T] extends never ? never
    : {
      type: "tool-call" | "tool-result";
      toolName: ToolNamesByTask[T];
      taskType: T;
    });

export type TaskStatus = "idle" | "generating" | "success" | "error";

export type TaskState<T extends TaskType = TaskType> = {
  taskType: T;
  status: TaskStatus;
  streamedText: string;
  error?: Error;
  abortController: AbortController | null;
  currentStep?: TaskStepInfo<T>;
};

export function getTaskState<T extends TaskType>(
  tasks: TasksState["tasks"],
  taskId: TaskId<T>,
): TaskState<T> | undefined {
  const state = tasks[taskId];
  if (state?.taskType) {
    return state as TaskState<T>;
  }
  return undefined;
}

const initialState: TasksState = {
  tasks: {},
};

export const createTasksSlice = <T extends TasksState>(
  set: StoreApi<T>["setState"],
  get: StoreApi<T>["getState"],
  deps: { toolRegistry: ToolRegistry; persistedStore: PersistedStore },
): TasksState & TasksActions => ({
  ...initialState,
  getState: <Task extends TaskType>(taskId: TaskId<Task>): TaskState<Task> | undefined => {
    const task = get().tasks[taskId];
    return task as TaskState<Task> | undefined;
  },
  cancel: (taskId: string) => {
    const state = get().tasks[taskId];
    if (state?.abortController) {
      state.abortController.abort();
    }
  },
  generate: async <Task extends TaskType>(
    taskId: TaskId<Task>,
    config: {
      model: LanguageModel;
      taskType: Task;
      args: TaskArgsMap[Task];
      onComplete?: (text: string) => void;
    },
  ) => {
    const abortController = new AbortController();
    const taskConfig = TASK_CONFIGS[config.taskType];
    const [system, prompt] = await Promise.all([
      taskConfig.getSystem(config.args, deps.persistedStore),
      taskConfig.getPrompt(config.args, deps.persistedStore),
    ]);

    set((state) =>
      mutate(state, (draft) => {
        draft.tasks[taskId] = {
          taskType: config.taskType,
          status: "generating",
          streamedText: "",
          error: undefined,
          abortController,
          currentStep: undefined,
        };
      })
    );

    try {
      const agent = getAgentForTask(config.taskType, config.model, config.args, deps);
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

        if (chunk.type === "error") {
          throw chunk.error;
        } else if (chunk.type === "text-delta") {
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
              if (currentState?.taskType === config.taskType) {
                (currentState as any).currentStep = {
                  type: "tool-call",
                  toolName: chunk.toolName as ToolNamesByTask[typeof config.taskType],
                  taskType: config.taskType,
                };
              }
            })
          );
        } else if (chunk.type === "tool-result") {
          set((state) =>
            mutate(state, (draft) => {
              const currentState = draft.tasks[taskId];
              if (currentState?.taskType === config.taskType) {
                (currentState as any).currentStep = {
                  type: "tool-result",
                  toolName: chunk.toolName as ToolNamesByTask[typeof config.taskType],
                  taskType: config.taskType,
                };
              }
            })
          );
        }
      }

      set((state) =>
        mutate(state, (draft) => {
          draft.tasks[taskId] = {
            taskType: config.taskType,
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
              taskType: config.taskType,
              status: "idle",
              streamedText: "",
              error: undefined,
              abortController: null,
              currentStep: undefined,
            };
          })
        );
      } else {
        const error = extractUnderlyingError(err);
        set((state) =>
          mutate(state, (draft) => {
            draft.tasks[taskId] = {
              taskType: config.taskType,
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

function extractUnderlyingError(err: unknown): Error {
  if (!(err instanceof Error)) {
    return new Error(String(err));
  }

  if (err.name === "AI_RetryError") {
    if ("cause" in err && err.cause instanceof Error) {
      return err.cause;
    }

    if ("lastError" in err && err.lastError instanceof Error) {
      return err.lastError;
    }

    if ("errors" in err && Array.isArray((err as any).errors)) {
      const errors = (err as any).errors;
      if (errors.length > 0 && errors[errors.length - 1] instanceof Error) {
        return errors[errors.length - 1];
      }
    }

    const match = err.message.match(/Last error: (.+)$/);
    if (match) {
      const underlyingMessage = match[1];
      const underlyingError = new Error(underlyingMessage);
      underlyingError.name = "AI_ProviderError";
      return underlyingError;
    }
  }

  return err;
}

function getAgentForTask<T extends TaskType>(
  taskType: T,
  model: LanguageModel,
  args: TaskArgsMap[T],
  deps: {
    toolRegistry: ToolRegistry;
    persistedStore: PersistedStore;
  },
) {
  const taskConfig = TASK_CONFIGS[taskType];
  const scopedTools = deps.toolRegistry.getTools("enhancing");
  return taskConfig.getAgent(model, args, scopedTools);
}
