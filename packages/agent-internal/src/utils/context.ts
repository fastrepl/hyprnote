import type { AIMessage, BaseMessage } from "@langchain/core/messages";

function getMessageTokens(msg: BaseMessage): number {
  let content =
    typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
  if (msg._getType() === "ai") {
    const aiMsg = msg as AIMessage;
    if (aiMsg.tool_calls?.length) {
      content += JSON.stringify(aiMsg.tool_calls);
    }
  }
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
  const nonSystemMessages = messages.filter((m) => m._getType() !== "system");

  const groups = groupMessagesWithToolCalls(nonSystemMessages);

  let tokenCount = 0;
  const kept: BaseMessage[][] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    const group = groups[i];
    const groupTokens = group.reduce(
      (sum, msg) => sum + getMessageTokens(msg),
      0,
    );

    if (tokenCount + groupTokens > maxTokens) {
      if (kept.length === 0 && groupTokens > maxTokens) {
        console.warn(
          `Single message group exceeds token limit: ${groupTokens} > ${maxTokens}`,
        );
      }
      if (kept.length > 0) {
        break;
      }
    }

    kept.unshift(group);
    tokenCount += groupTokens;
  }

  return kept.flat();
}
