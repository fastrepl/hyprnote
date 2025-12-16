import type { LanguageModel, TextStreamPart } from "ai";

import type { Template } from "@hypr/store";

import type { Store as PersistedStore } from "../../../tinybase/main";
import { StreamTransform } from "../shared/transform_infra";
import type { TaskStepInfo } from "../tasks";
import { enhanceTransform } from "./enhance-transform";
import { enhanceWorkflow } from "./enhance-workflow";
import { titleTransform } from "./title-transform";
import { titleWorkflow } from "./title-workflow";

export type TaskType = "enhance" | "title";

export interface TaskArgsMap {
  enhance: { sessionId: string; enhancedNoteId: string; templateId?: string };
  title: { sessionId: string };
}

export interface TaskArgsMapTransformed {
  enhance: {
    sessionId: string;
    enhancedNoteId: string;
    rawMd: string;
    language: string;
    sessionData: {
      title: string;
      started_at?: string;
      ended_at?: string;
      location?: string;
      description?: string;
      is_event: boolean;
    };
    participants: Array<{
      name: string;
      job_title: string;
    }>;
    segments: Array<{
      speaker_label: string;
      start_ms: number;
      end_ms: number;
      text: string;
      words: Array<{
        text: string;
        start_ms: number;
        end_ms: number;
      }>;
    }>;
    template?: Pick<Template, "sections">;
  };
  title: {
    sessionId: string;
    enhancedMd: string;
    language: string;
  };
}

export type TaskId<T extends TaskType = TaskType> = `${string}-${T}`;

export function createTaskId<T extends TaskType>(
  entityId: string,
  taskType: T,
): TaskId<T> {
  return `${entityId}-${taskType}` as TaskId<T>;
}

export interface TaskConfig<T extends TaskType = TaskType> {
  transformArgs: (
    args: TaskArgsMap[T],
    store: PersistedStore,
  ) => Promise<TaskArgsMapTransformed[T]>;
  executeWorkflow: (params: {
    model: LanguageModel;
    args: TaskArgsMapTransformed[T];
    onProgress: (step: TaskStepInfo<T>) => void;
    signal: AbortSignal;
    store: PersistedStore;
  }) => AsyncIterable<TextStreamPart<any>>;
  transforms?: StreamTransform[];
}

type TaskConfigMap = {
  [K in TaskType]: TaskConfig<K>;
};

export const TASK_CONFIGS: TaskConfigMap = {
  enhance: {
    ...enhanceWorkflow,
    ...enhanceTransform,
  },
  title: {
    ...titleWorkflow,
    ...titleTransform,
  },
};
