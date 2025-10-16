import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { ChatRequestOptions, ChatTransport, UIMessageChunk } from "ai";
import { convertToModelMessages, smoothStream, stepCountIs, streamText } from "ai";

import { ToolRegistry } from "../contexts/tool";
import type { HyprUIMessage } from "./types";

const modelName = "qwen/qwen3-vl-8b-thinking";
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
