import type { ChatTransport, LanguageModel } from "ai";
import { convertToModelMessages } from "ai";

import { type ToolRegistry } from "../contexts/tool";
import { AGENT_CONFIGS } from "../store/zustand/ai-task/task-configs";
import type { HyprUIMessage } from "./types";

export class CustomChatTransport implements ChatTransport<HyprUIMessage> {
  constructor(private registry: ToolRegistry, private model: LanguageModel) {}

  sendMessages: ChatTransport<HyprUIMessage>["sendMessages"] = async (options) => {
    const tools = this.registry.getTools("chat");
    const agent = AGENT_CONFIGS.chat.getAgent(this.model, {}, tools);
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
