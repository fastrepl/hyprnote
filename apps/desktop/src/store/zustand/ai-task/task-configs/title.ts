import { Experimental_Agent as Agent, type LanguageModel, Tool } from "ai";

import { commands as templateCommands } from "@hypr/plugin-template";
import type { Store as PersistedStore } from "../../../tinybase/persisted";
import type { TaskArgsMap, TaskConfig } from ".";

export const title: TaskConfig<"title"> = {
  getSystem,
  getPrompt,
  getAgent: (model, tools = {}) => getAgent(model, tools),
  transforms: [],
};

async function getSystem() {
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
    content: enhancedMd,
  });
  if (result.status === "ok") {
    return result.data;
  }
  console.error("Failed to render title user prompt:", result.error);
  throw new Error(result.error);
}

function getAgent(model: LanguageModel, _tools: Record<string, Tool> = {}) {
  return new Agent({
    model,
    tools: {},
    prepareStep: async () => {
      return { toolChoice: "none" };
    },
  });
}
