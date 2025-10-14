import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { ChatRequestOptions, ChatTransport, UIMessage, UIMessageChunk } from "ai";
import { convertToModelMessages, stepCountIs, streamText } from "ai";

import { searchSessionsTool } from "./tools";

const provider = createOpenAICompatible({
  name: "openrouter",
  baseURL: "https://openrouter.ai/api/v1",
});

export class CustomChatTransport implements ChatTransport<UIMessage> {
  async sendMessages(
    options:
      & {
        chatId: string;
        messages: UIMessage[];
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

      tools,
      stopWhen: stepCountIs(5),
      abortSignal: options.abortSignal,
    });

    return result.toUIMessageStream({
      onError: (error) => {
        console.error("Stream error:", error);
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
