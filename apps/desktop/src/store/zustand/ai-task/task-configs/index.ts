import type { LanguageModel, TextStreamPart } from "ai";

import type { ChannelProfile } from "../../../../utils/segment";
import type { Store as PersistedStore, Template } from "../../../tinybase/main";
import { StreamTransform } from "../shared/transform_infra";
import type { TaskStepInfo } from "../tasks";

import { enhancePrompt } from "./enhance-prompt";
import { enhanceTransform } from "./enhance-transform";
import { enhanceWorkflow } from "./enhance-workflow";
import { titlePrompt } from "./title-prompt";
import { titleTransform } from "./title-transform";
import { titleWorkflow } from "./title-workflow";

export type TaskType = "enhance" | "title";

export interface TaskArgsMap {
  enhance: { sessionId: string; templateId?: string };
  title: { sessionId: string };
}

export interface EnrichedTaskArgsMap {
  enhance: {
    sessionId: string;
    rawMd: string;
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
      channel: ChannelProfile;
      start_ms: number;
      end_ms: number;
      text: string;
      words: Array<{
        text: string;
        start_ms: number;
        end_ms: number;
      }>;
    }>;
    template?: Template;
  };
  title: {
    sessionId: string;
    enhancedMd: string;
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
  transformArgs: (args: TaskArgsMap[T], store: PersistedStore) => Promise<EnrichedTaskArgsMap[T]>;
  executeWorkflow: (params: {
    model: LanguageModel;
    args: EnrichedTaskArgsMap[T];
    system: string;
    prompt: string;
    onProgress: (step: TaskStepInfo<T>) => void;
    signal: AbortSignal;
  }) => AsyncIterable<TextStreamPart<any>>;
  getUser: (args: EnrichedTaskArgsMap[T]) => Promise<string>;
  getSystem: (args: EnrichedTaskArgsMap[T]) => Promise<string>;
  transforms?: StreamTransform[];
}

type TaskConfigMap = {
  [K in TaskType]: TaskConfig<K>;
};

export const TASK_CONFIGS: TaskConfigMap = {
  enhance: {
    ...enhanceWorkflow,
    ...enhanceTransform,
    ...enhancePrompt,
  },
  title: {
    ...titleWorkflow,
    ...titleTransform,
    ...titlePrompt,
  },
};
