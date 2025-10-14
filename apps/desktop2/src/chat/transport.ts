import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { ChatRequestOptions, ChatTransport, UIMessageChunk } from "ai";
import { convertToModelMessages, smoothStream, stepCountIs, streamText } from "ai";

import { ToolRegistry } from "../contexts/tool";
import type { HyprUIMessage } from "./types";

const modelName = "google/gemini-2.5-flash-lite";
const provider = createOpenAICompatible({
  name: "openrouter",
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: "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",
});

export class CustomChatTransport implements ChatTransport<HyprUIMessage> {
  constructor(private registry: ToolRegistry) {}

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
    const model = provider.chatModel(modelName);
    const tools = this.registry.getForTransport();

    const result = streamText({
      model,
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
