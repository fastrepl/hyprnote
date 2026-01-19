import type { BaseMessage } from "@langchain/core/messages";

export function compressMessages(
  messages: BaseMessage[],
  maxTokens: number = 100000,
): BaseMessage[] {
  const systemMessages = messages.filter((m) => m._getType() === "system");
  const nonSystemMessages = messages.filter((m) => m._getType() !== "system");

  let tokenCount = 0;
  const kept: BaseMessage[] = [];

  for (let i = nonSystemMessages.length - 1; i >= 0; i--) {
    const msg = nonSystemMessages[i];
    const content =
      typeof msg.content === "string"
        ? msg.content
        : JSON.stringify(msg.content);
    const tokens = Math.ceil(content.length / 4);

    if (tokenCount + tokens > maxTokens && kept.length > 0) {
      break;
    }

    kept.unshift(msg);
    tokenCount += tokens;
  }

  return [...systemMessages, ...kept];
}
