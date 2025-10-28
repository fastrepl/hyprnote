import type { Experimental_Agent as Agent, LanguageModel, Tool } from "ai";

import type { Store as PersistedStore } from "../../../tinybase/persisted";
import { StreamTransform } from "../shared/transform_infra";
import { chat } from "./chat";
import { enhance } from "./enhance";
import { title } from "./title";

export type TaskType = "chat" | "enhance" | "title";

export interface TaskArgsMap {
  chat: Record<string, never>;
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
  getAgent: (model: LanguageModel, args: TaskArgsMap[T], tools?: Record<string, Tool>) => Agent<any, any, any>;
  getPrompt: (args: TaskArgsMap[T], store: PersistedStore) => Promise<string>;
  getSystem: (args: TaskArgsMap[T], store: PersistedStore) => Promise<string>;
  getTools?: (model: LanguageModel) => Record<string, Tool>;
  transforms?: StreamTransform[];
}

type TaskConfigMap = {
  [K in TaskType]: TaskConfig<K>;
};

export const TASK_CONFIGS: TaskConfigMap = {
  chat,
  enhance,
  title,
};

export type ToolNamesByTask = {
  chat: never;
  enhance: "analyzeStructure";
  title: never;
};
