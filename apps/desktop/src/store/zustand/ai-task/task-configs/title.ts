import { type LanguageModel, streamText } from "ai";

import { commands as templateCommands } from "@hypr/plugin-template";
import type { Store as PersistedStore } from "../../../tinybase/main";
import type { TaskArgsMap, TaskConfig } from ".";

export const title: TaskConfig<"title"> = {
  getSystem,
  getPrompt,
  executeWorkflow,
  transforms: [],
};

async function getSystem(_args: TaskArgsMap["title"]) {
  const result = await templateCommands.render("title.system", {});
  if (result.status === "ok") {
    return result.data;
  }
  throw new Error(result.error);
}

async function getPrompt(args: TaskArgsMap["title"], store: PersistedStore) {
  const { sessionId } = args;
  const enhancedMd = (store.getCell("sessions", sessionId, "enhanced_md") as string) || "";

  const result = await templateCommands.render("title.user", {
    enhanced_note: enhancedMd,
  });
  if (result.status === "ok") {
    return result.data;
  }
  console.error("Failed to render title user prompt:", result.error);
  throw new Error(result.error);
}

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
