import { Experimental_Agent as Agent, type LanguageModel, stepCountIs, type Tool } from "ai";

import type { AgentConfig } from ".";

export const chat: AgentConfig<"chat"> = {
  getAgent: (model, _args, tools = {}) => getAgent(model, tools),
};

function getAgent(model: LanguageModel, tools: Record<string, Tool> = {}) {
  return new Agent({
    model,
    tools,
    stopWhen: stepCountIs(5),
    prepareStep: async ({ messages }) => {
      if (messages.length > 20) {
        return { messages: messages.slice(-10) };
      }

      return {};
    },
  });
}
