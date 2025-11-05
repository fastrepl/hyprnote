import type { LanguageModel, TextStreamPart } from "ai";

import type { Store as PersistedStore } from "../../../tinybase/main";
import { StreamTransform } from "../shared/transform_infra";
import type { TaskStepInfo } from "../tasks";

import { enhancePrompt } from "./enhance-prompt";
import { enhanceWorkflow } from "./enhance-workflow";
import { titlePrompt } from "./title-prompt";
import { titleWorkflow } from "./title-workflow";

export type TaskType = "enhance" | "title";

export interface TaskArgsMap {
  enhance: { sessionId: string; templateId?: string };
  title: { sessionId: string };
}

export type TaskId<T extends TaskType = TaskType> = `${string}-${T}`;

export function createTaskId<T extends TaskType>(
  entityId: string,
  taskType: T,
): TaskId<T> {
  return `${entityId}-${taskType}` as TaskId<T>;
}

export interface TaskConfig<T extends TaskType = TaskType> {
  executeWorkflow: (params: {
    model: LanguageModel;
    args: TaskArgsMap[T];
    system: string;
    prompt: string;
    onProgress: (step: TaskStepInfo<T>) => void;
    signal: AbortSignal;
  }) => AsyncIterable<TextStreamPart<any>>;
  getUser: (args: TaskArgsMap[T], store: PersistedStore) => Promise<string>;
  getSystem: (args: TaskArgsMap[T], store: PersistedStore) => Promise<string>;
  transforms?: StreamTransform[];
}

type TaskConfigMap = {
  [K in TaskType]: TaskConfig<K>;
};

export const TASK_CONFIGS: TaskConfigMap = {
  enhance: {
    ...enhanceWorkflow,
    ...enhancePrompt,
  },
  title: {
    ...titleWorkflow,
    ...titlePrompt,
  },
};
