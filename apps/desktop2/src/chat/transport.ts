import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { ChatRequestOptions, ChatTransport, UIMessageChunk } from "ai";
import { convertToModelMessages, smoothStream, stepCountIs, streamText } from "ai";

import { searchSessionsTool } from "./tools";
import type { HyprUIMessage } from "./types";

const provider = createOpenAICompatible({
  name: "openrouter",
  baseURL: "https://openrouter.ai/api/v1",
});

export class CustomChatTransport implements ChatTransport<HyprUIMessage> {
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
    const model = provider.chatModel("openai/gpt-5-mini");
    const tools = this.getTools();

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

  private getTools(): Parameters<typeof streamText>[0]["tools"] {
    return {
      search_sessions: searchSessionsTool,
    };
  }
}
