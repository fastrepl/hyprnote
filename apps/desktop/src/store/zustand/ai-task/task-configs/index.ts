import type { Experimental_Agent as Agent, LanguageModel, Tool } from "ai";

import type { Store as PersistedStore } from "../../../tinybase/persisted";
import { StreamTransform } from "../shared/transform_infra";
import { enhance } from "./enhance";
import { title } from "./title";

export type TaskType = "enhance" | "title";
type TaskConfigMap = Record<TaskType, TaskConfig>;

export interface TaskConfig {
  getAgent: (model: LanguageModel, tools?: Record<string, Tool>) => Agent<any, any, any>;
  getPrompt: (args?: Record<string, unknown>, store?: PersistedStore) => Promise<string>;
  getSystem: (args?: Record<string, unknown>, store?: PersistedStore) => Promise<string>;
  transforms?: StreamTransform[];
}

export const TASK_CONFIGS: TaskConfigMap = {
  enhance,
  title,
};
