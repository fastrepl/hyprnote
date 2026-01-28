import type { BaseMessage } from "@langchain/core/messages";
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";
import path from "path";

import {
  type AgentStateType,
  compilePrompt,
  compressMessages,
  createModel,
  ensureMessageIds,
  loadPrompt,
  type PromptConfig,
} from "@hypr/agent-core";

import { tools } from "../tools";

const prompt = loadPrompt(path.join(import.meta.dirname, ".."));

function getRequestFromMessages(messages: BaseMessage[]): string | null {
  if (messages.length === 0) return null;
  const lastMessage = messages[messages.length - 1];
  if (HumanMessage.isInstance(lastMessage)) {
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

  const hasAIMessages = compressedMessages.some((m) => AIMessage.isInstance(m));

  let promptMessagesToPersist: BaseMessage[] = [];

  if (!hasAIMessages) {
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
    promptMessagesToPersist = promptMessages;
  } else {
    const systemMessage = state.messages.find((m) =>
      SystemMessage.isInstance(m),
    );
    if (systemMessage) {
      messages = [systemMessage, ...compressedMessages];
    }
  }

  const model = createModel(promptConfig, tools);

  const response = (await model.invoke(messages)) as AIMessage;

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
