import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { ChatRequestOptions, ChatTransport, UIMessage, UIMessageChunk } from "ai";
import { convertToModelMessages, streamText } from "ai";

const provider = createOpenAICompatible({
  name: "lmstudio",
  baseURL: "http://localhost:1234/v1",
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
    const model = provider.chatModel("local-model");

    const result = streamText({
      model,
      messages: convertToModelMessages(options.messages),
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
}
