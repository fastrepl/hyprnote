import { AIMessage, BaseMessage, ToolMessage } from "@langchain/core/messages";
import type { ToolCall } from "@langchain/core/messages/tool";
import {
  addMessages,
  entrypoint,
  getPreviousState,
  task,
} from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";

import { env } from "../../env";
import { compilePrompt, loadPrompt, type PromptConfig } from "../../prompt";
import {
  type AgentGraph,
  isRetryableError,
  type SpecialistConfig,
} from "../../types";
import { compressMessages } from "../../utils/context";
import { runAgentLoop } from "../../utils/loop";
import { executeCodeTool } from "./tools";

type ModelWithTools = ReturnType<ReturnType<typeof createModel>["bindTools"]>;

function createModel(promptConfig: PromptConfig) {
  return new ChatOpenAI({
    model: promptConfig.model ?? "anthropic/claude-opus-4.5",
    temperature: promptConfig.temperature ?? 0,
    configuration: {
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: env.OPENROUTER_API_KEY,
    },
  });
}

const invokeModel = task(
  {
    name: "specialist:invokeModel",
    retry: {
      maxAttempts: 3,
      retryOn: isRetryableError,
      initialInterval: 1000,
    },
  },
  async (params: {
    model: ModelWithTools;
    messages: BaseMessage[];
  }): Promise<AIMessage> => {
    return params.model.invoke(params.messages);
  },
);

const executeCode = task(
  {
    name: "specialist:executeCode",
    retry: {
      maxAttempts: 2,
      retryOn: isRetryableError,
      initialInterval: 1000,
    },
  },
  async (toolCall: ToolCall): Promise<ToolMessage> => {
    try {
      const args = toolCall.args as { code: string; isMutating: boolean };
      const result = await executeCodeTool.invoke(args);
      return new ToolMessage({
        content: typeof result === "string" ? result : JSON.stringify(result),
        tool_call_id: toolCall.id!,
      });
    } catch (error) {
      if (isRetryableError(error)) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`executeCode failed:`, errorMessage);
      return new ToolMessage({
        content: `Code execution failed: ${errorMessage}`,
        tool_call_id: toolCall.id!,
      });
    }
  },
);

export function createSpecialist(
  config: SpecialistConfig,
): AgentGraph<string, string> {
  const prompt = loadPrompt(config.promptDir);

  return entrypoint(
    {
      name: `specialist-${config.name}`,
      checkpointer: config.checkpointer,
    },
    async (request: string) => {
      const previous = getPreviousState<BaseMessage[]>();
      const context = config.getContext ? await config.getContext() : {};
      const { messages: promptMessages, config: promptConfig } =
        await compilePrompt(prompt, { request, ...context });

      let messages = await compressMessages(previous ?? []);
      messages = addMessages(messages, promptMessages);

      const model = createModel(promptConfig).bindTools([executeCodeTool]);

      const { response, messages: finalMessages } = await runAgentLoop(
        {
          model,
          invokeModel,
          invokeTool: executeCode,
        },
        messages,
      );

      const allMessages = addMessages(finalMessages, [response]);

      return entrypoint.final({
        value: response.text || "No response",
        save: allMessages,
      });
    },
  );
}
