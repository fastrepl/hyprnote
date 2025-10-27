import { Experimental_Agent as Agent, type LanguageModel, Tool } from "ai";

import { commands as templateCommands } from "@hypr/plugin-template";
import { TaskConfig } from ".";

export const title: TaskConfig = {
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

async function getPrompt() {
  const result = await templateCommands.render("title.user", {});
  if (result.status === "ok") {
    return result.data;
  }
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
