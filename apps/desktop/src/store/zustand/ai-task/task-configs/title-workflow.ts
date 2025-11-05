import { type LanguageModel, streamText } from "ai";

import { commands as templateCommands } from "@hypr/plugin-template";
import type { TaskArgsMapTransformed, TaskConfig } from ".";

export const titleWorkflow: Pick<TaskConfig<"title">, "executeWorkflow" | "transforms"> = {
  executeWorkflow,
  transforms: [],
};

async function* executeWorkflow(params: {
  model: LanguageModel;
  args: TaskArgsMapTransformed["title"];
  onProgress: (step: any) => void;
  signal: AbortSignal;
}) {
  const { model, args, onProgress, signal } = params;

  const system = await getSystemPrompt(args);
  const prompt = await getUserPrompt(args);

  onProgress({ type: "generating" });

  const result = streamText({
    model,
    system,
    prompt,
    abortSignal: signal,
  });

  yield* result.fullStream;
}

async function getSystemPrompt(_args: TaskArgsMapTransformed["title"]) {
  const result = await templateCommands.render("title.system", {});

  if (result.status === "error") {
    throw new Error(result.error);
  }

  return result.data;
}

async function getUserPrompt(args: TaskArgsMapTransformed["title"]) {
  const { enhancedMd } = args;

  const result = await templateCommands.render(
    "title.user",
    { enhanced_note: enhancedMd },
  );

  if (result.status === "error") {
    throw new Error(result.error);
  }

  return result.data;
}
