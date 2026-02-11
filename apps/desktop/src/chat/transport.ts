import {
  type ChatTransport,
  convertToModelMessages,
  type LanguageModel,
  stepCountIs,
  ToolLoopAgent,
} from "ai";

import { type ToolRegistry } from "../contexts/tool";
import type { HyprUIMessage } from "./types";

const MAX_TOOL_STEPS = 5;
const MESSAGE_WINDOW_THRESHOLD = 20;
const MESSAGE_WINDOW_SIZE = 10;

export class CustomChatTransport implements ChatTransport<HyprUIMessage> {
  constructor(
    private registry: ToolRegistry,
    private model: LanguageModel,
    private chatType: "general" | "support",
    private systemPrompt?: string,
    private extraTools?: Record<string, any>,
  ) {}

  sendMessages: ChatTransport<HyprUIMessage>["sendMessages"] = async (
    options,
  ) => {
    const scope = this.chatType === "support" ? "chat-support" : "chat-general";
    const tools = {
      ...this.registry.getTools(scope),
      ...this.extraTools,
    };

    const agent = new ToolLoopAgent({
      model: this.model,
      instructions: this.systemPrompt,
      tools,
      stopWhen: stepCountIs(MAX_TOOL_STEPS),
      prepareStep: async ({ messages }) => {
        if (messages.length > MESSAGE_WINDOW_THRESHOLD) {
          return { messages: messages.slice(-MESSAGE_WINDOW_SIZE) };
        }

        return {};
      },
    });

    const result = await agent.stream({
      messages: await convertToModelMessages(options.messages),
    });

    return result.toUIMessageStream({
      originalMessages: options.messages,
      messageMetadata: ({ part }: { part: { type: string } }) => {
        if (part.type === "start") {
          return { createdAt: Date.now() };
        }
      },
      onError: (error: unknown) => {
        console.error(error);
        return error instanceof Error ? error.message : String(error);
      },
    });
  };

  reconnectToStream: ChatTransport<HyprUIMessage>["reconnectToStream"] =
    async () => {
      return null;
    };
}
