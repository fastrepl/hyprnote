import { generateId, generateObject, type LanguageModel } from "ai";
import { z } from "zod";

import { commands as templateCommands } from "@hypr/plugin-template";

import type { TaskArgsMapTransformed, TaskConfig } from ".";
import type { Store } from "../../../tinybase/main";
import { getCustomPrompt } from "../../../tinybase/prompts";

export const titleWorkflow: Pick<
  TaskConfig<"title">,
  "executeWorkflow" | "transforms"
> = {
  executeWorkflow,
  transforms: [],
};

async function* executeWorkflow(params: {
  model: LanguageModel;
  args: TaskArgsMapTransformed["title"];
  onProgress: (step: any) => void;
  signal: AbortSignal;
  store: Store;
}) {
  const { model, args, onProgress, signal, store } = params;

  const system = await getSystemPrompt(args);
  const prompt = await getUserPrompt(args, store);

  onProgress({ type: "generating" });

  const schema = z.object({
    title: z.string(),
  });

  try {
    const { object } = await generateObject({
      model,
      temperature: 0,
      schema,
      system,
      prompt,
      abortSignal: signal,
    });
    const id = generateId();

    yield {
      type: "text-delta" as const,
      id,
      text: object.title,
    };
  } catch (error) {
    console.error(JSON.stringify(error));
    throw error;
  }
}

async function getSystemPrompt(args: TaskArgsMapTransformed["title"]) {
  const result = await templateCommands.render("title.system", {
    language: args.language,
  });

  if (result.status === "error") {
    throw new Error(result.error);
  }

  return result.data;
}

async function getUserPrompt(
  args: TaskArgsMapTransformed["title"],
  store: Store,
) {
  const { enhancedMd } = args;
  const ctx = { enhanced_note: enhancedMd };

  const customPrompt = getCustomPrompt(store, "title");

  if (customPrompt) {
    const result = await templateCommands.renderCustom(customPrompt, ctx);
    if (result.status === "error") {
      throw new Error(result.error);
    }
    return result.data;
  }

  const result = await templateCommands.render("title.user", ctx);

  if (result.status === "error") {
    throw new Error(result.error);
  }

  return result.data;
}
