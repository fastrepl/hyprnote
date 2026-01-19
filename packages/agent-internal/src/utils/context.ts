import type { AIMessage, BaseMessage } from "@langchain/core/messages";

function getMessageTokens(msg: BaseMessage): number {
  const content =
    typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
  return Math.ceil(content.length / 4);
}

function isAIMessageWithToolCalls(msg: BaseMessage): boolean {
  if (msg._getType() !== "ai") return false;
  const aiMsg = msg as AIMessage;
  return (aiMsg.tool_calls?.length ?? 0) > 0;
}

function groupMessagesWithToolCalls(messages: BaseMessage[]): BaseMessage[][] {
  const groups: BaseMessage[][] = [];
  let currentGroup: BaseMessage[] = [];

  for (const msg of messages) {
    if (isAIMessageWithToolCalls(msg)) {
      if (currentGroup.length > 0) {
        groups.push(currentGroup);
      }
      currentGroup = [msg];
    } else if (msg._getType() === "tool" && currentGroup.length > 0) {
      currentGroup.push(msg);
    } else {
      if (currentGroup.length > 0) {
        groups.push(currentGroup);
        currentGroup = [];
      }
      groups.push([msg]);
    }
  }

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}

export function compressMessages(
  messages: BaseMessage[],
  maxTokens: number = 100000,
): BaseMessage[] {
  const systemMessages = messages.filter((m) => m._getType() === "system");
  const nonSystemMessages = messages.filter((m) => m._getType() !== "system");

  let tokenCount = 0;

  for (const msg of systemMessages) {
    tokenCount += getMessageTokens(msg);
  }

  const groups = groupMessagesWithToolCalls(nonSystemMessages);

  const kept: BaseMessage[][] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    const group = groups[i];
    const groupTokens = group.reduce(
      (sum, msg) => sum + getMessageTokens(msg),
      0,
    );

    if (tokenCount + groupTokens > maxTokens && kept.length > 0) {
      break;
    }

    kept.unshift(group);
    tokenCount += groupTokens;
  }

  return [...systemMessages, ...kept.flat()];
}
