import type { AIMessage, BaseMessage } from "@langchain/core/messages";
import { SystemMessage } from "@langchain/core/messages";
import path from "path";

import { compilePrompt, loadPrompt, type PromptConfig } from "../prompt";
import type { AgentStateType } from "../state";
import { tools } from "../tools";
import { compressMessages } from "../utils/context";
import { createModel, ensureMessageIds } from "../utils/shared";

const prompt = loadPrompt(path.join(import.meta.dirname, ".."));

function getRequestFromMessages(messages: BaseMessage[]): string | null {
  if (messages.length === 0) return null;
  const lastMessage = messages[messages.length - 1];
  if (lastMessage._getType() === "human") {
    return typeof lastMessage.content === "string"
      ? lastMessage.content
      : JSON.stringify(lastMessage.content);
  }
  return null;
}

export async function agentNode(
  state: AgentStateType,
): Promise<Partial<AgentStateType>> {
  const compressedMessages = await compressMessages(state.messages);

  let messages = compressedMessages;
  let promptConfig: PromptConfig = {
    model: "anthropic/claude-opus-4.5",
    temperature: 0,
  };

  // Check if this is a fresh invocation (no AI messages yet)
  const hasAIMessages = compressedMessages.some((m) => m._getType() === "ai");

  // Track if we need to persist the prompt messages (including SystemMessage)
  let promptMessagesToPersist: BaseMessage[] = [];

  if (!hasAIMessages) {
    // Determine the request: either from messages (Chat interface) or from state.request (slack-internal)
    const requestFromMessages = getRequestFromMessages(compressedMessages);
    const request = requestFromMessages || state.request;

    if (!request) {
      throw new Error(
        "No request provided: expected either messages with a HumanMessage or state.request",
      );
    }

    const { messages: promptMessages, config } = await compilePrompt(
      prompt,
      { request },
      state.images,
    );
    messages = promptMessages;
    promptConfig = config;
    // Store the prompt messages to persist them in state (including SystemMessage)
    promptMessagesToPersist = promptMessages;
  } else {
    // Subsequent invocation after tool calls: compressMessages drops SystemMessage
    // We need to restore it from the original state.messages
    const systemMessage = state.messages.find((m) =>
      SystemMessage.isInstance(m),
    );
    if (systemMessage) {
      // Prepend the SystemMessage to the compressed messages
      messages = [systemMessage, ...compressedMessages];
    }
  }

  const model = createModel(promptConfig, tools);

  const response = (await model.invoke(messages)) as AIMessage;

  // On first invocation, persist the full prompt messages (including SystemMessage)
  // so they're available for subsequent invocations after tool calls.
  // Ensure all messages have stable IDs to prevent deduplication issues with messagesStateReducer.
  const messagesToReturn =
    promptMessagesToPersist.length > 0
      ? ensureMessageIds([...promptMessagesToPersist, response])
      : [response];

  if (!response.tool_calls || response.tool_calls.length === 0) {
    return {
      messages: messagesToReturn,
      output: response.text || "No response",
    };
  }

  return {
    messages: messagesToReturn,
  };
}
