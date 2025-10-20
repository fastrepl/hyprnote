import type { ChatRequestOptions, ChatTransport, LanguageModel, UIMessageChunk } from "ai";
import { convertToModelMessages, smoothStream, stepCountIs, streamText } from "ai";

import { ToolRegistry } from "../contexts/tool";
import type { HyprUIMessage } from "./types";

export class CustomChatTransport implements ChatTransport<HyprUIMessage> {
  constructor(private registry: ToolRegistry, private model: LanguageModel) {}

  async sendMessages(
    options:
      & {
        chatId: string;
        messages: HyprUIMessage[];
        abortSignal: AbortSignal | undefined;
      }
      & { trigger: "submit-message" | "regenerate-message"; messageId: string | undefined }
      & ChatRequestOptions,
  ): Promise<ReadableStream<UIMessageChunk>> {
    const tools = this.registry.getForTransport();

    const result = streamText({
      model: this.model,
      messages: convertToModelMessages(options.messages),
      experimental_transform: smoothStream({ chunking: "word" }),
      tools,
      stopWhen: stepCountIs(5),
      abortSignal: options.abortSignal,
    });

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
  }

  async reconnectToStream(): Promise<ReadableStream<UIMessageChunk> | null> {
    return null;
  }
}
