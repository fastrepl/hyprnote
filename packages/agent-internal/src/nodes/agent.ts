import type { AIMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";

import { env } from "../env";
import { compilePrompt, loadPrompt, type PromptConfig } from "../prompt";
import type { AgentStateType } from "../state";
import { tools } from "../tools";
import { isRetryableError } from "../types";
import { compressMessages } from "../utils/context";

const prompt = loadPrompt(import.meta.dirname + "/..");

function createModel(config: PromptConfig) {
  return new ChatOpenAI({
    model: config.model ?? "anthropic/claude-opus-4.5",
    temperature: config.temperature ?? 0,
    configuration: {
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: env.OPENROUTER_API_KEY,
    },
  }).bindTools(tools);
}

export async function agentNode(
  state: AgentStateType,
): Promise<Partial<AgentStateType>> {
  const compressedMessages = await compressMessages(state.messages);

  let messages = compressedMessages;
  const isFirstInvocation = compressedMessages.length === 0;

  if (isFirstInvocation) {
    const { messages: promptMessages, config } = await compilePrompt(
      prompt,
      { request: state.request },
      state.images,
    );
    messages = promptMessages;
  }

  const promptConfig: PromptConfig = {
    model: "anthropic/claude-opus-4.5",
    temperature: 0,
  };
  const model = createModel(promptConfig);

  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      const response = (await model.invoke(messages)) as AIMessage;

      if (!response.tool_calls || response.tool_calls.length === 0) {
        return {
          messages: [response],
          output: response.text || "No response",
        };
      }

      return {
        messages: [response],
      };
    } catch (error) {
      attempts++;
      if (!isRetryableError(error) || attempts >= maxAttempts) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  throw new Error("Model invocation failed after retries");
}
