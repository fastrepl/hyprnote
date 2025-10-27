import { type Experimental_Agent as Agent, type LanguageModel, smoothStream } from "ai";

import { createEnhancingAgent } from "../../../contexts/ai-task/enhancing";
import { trimBeforeMarker } from "./shared/transform_impl";

export type TaskType = "enhance";

export interface TaskConfig {
  getPrompt: (args?: Record<string, unknown>) => string;
  getAgent?: (model: LanguageModel, tools?: Record<string, any>) => Agent<any, any, any>;
  transforms?: any[];
}

export const TASK_CONFIGS: Record<TaskType, TaskConfig> = {
  enhance: {
    getPrompt: () => {
      return "Generate some random meeting summary, following markdown format. Start with h2 header(##) and no more than h3. Each header should have more than 5 points, bullet points.";
    },
    getAgent: (model, tools = {}) => createEnhancingAgent(model, tools),
    transforms: [
      trimBeforeMarker("##"),
      smoothStream({ delayInMs: 100, chunking: "line" }),
    ],
  },
};
