import type { ChatTransport, LanguageModel } from "ai";
import { convertToModelMessages, Experimental_Agent as Agent, stepCountIs } from "ai";

import { ToolRegistry } from "../contexts/tool";
import type { HyprUIMessage } from "./types";

export class CustomChatTransport implements ChatTransport<HyprUIMessage> {
  constructor(private registry: ToolRegistry, private model: LanguageModel) {}

  sendMessages: ChatTransport<HyprUIMessage>["sendMessages"] = async (options) => {
    const tools = this.registry.getForTransport();

    const agent = new Agent({
      model: this.model,
      tools,
      stopWhen: stepCountIs(5),
      prepareStep: async ({ messages }) => {
        if (messages.length > 20) {
          return { messages: messages.slice(-10) };
        }

        return {};
      },
    });

    const result = agent.stream({ messages: convertToModelMessages(options.messages) });

    return result.toUIMessageStream({
      originalMessages: options.messages,
      messageMetadata: ({ part }) => {
        if (part.type === "start") {
          return { createdAt: Date.now() };
        }
      },
      onError: (error) => {
        console.error(error);
        return error instanceof Error ? error.message : String(error);
      },
    });
  };

  reconnectToStream: ChatTransport<HyprUIMessage>["reconnectToStream"] = async () => {
    return null;
  };
}
