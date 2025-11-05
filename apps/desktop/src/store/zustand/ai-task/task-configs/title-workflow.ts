import { type LanguageModel, streamText } from "ai";

import type { TaskArgsMap, TaskConfig } from ".";

export const titleWorkflow: Pick<TaskConfig<"title">, "executeWorkflow" | "transforms"> = {
  executeWorkflow,
  transforms: [],
};

async function* executeWorkflow(params: {
  model: LanguageModel;
  args: TaskArgsMap["title"];
  system: string;
  prompt: string;
  onProgress: (step: any) => void;
  signal: AbortSignal;
}) {
  const { model, system, prompt, onProgress, signal } = params;

  onProgress({ type: "generating" });

  const result = streamText({
    model,
    system,
    prompt,
    abortSignal: signal,
  });

  yield* result.fullStream;
}
