import { AIMessage, BaseMessage, ToolMessage } from "@langchain/core/messages";
import type { ToolCall } from "@langchain/core/messages/tool";
import type { StructuredToolInterface } from "@langchain/core/tools";
import { entrypoint, task } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";

import { env } from "../../../env";
import { compilePrompt, loadPrompt, type PromptConfig } from "../../prompt";
import { isRetryableError, type SpecialistConfig } from "../../types";
import { runAgenticLoop } from "../../utils/loop";
import { createExecuteCodeTool } from "./tools";

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

function createModelWithTools(promptConfig: PromptConfig): {
  model: ModelWithTools;
  executeTool: StructuredToolInterface;
} {
  const model = createModel(promptConfig);
  const tools = (promptConfig.tools ?? []).map(createExecuteCodeTool);
  return {
    model: model.bindTools(tools),
    executeTool: tools[0]!,
  };
}

const invokeModel = task(
  {
    name: "specialist:invokeModel",
    retry: {
      maxAttempts: 3,
      retryOn: isRetryableError,
    },
  },
  async (params: {
    model: ModelWithTools;
    messages: BaseMessage[];
  }): Promise<AIMessage> => {
    return params.model.invoke(params.messages);
  },
);

function createExecuteCodeTaskForTool(executeTool: StructuredToolInterface) {
  return async (toolCall: ToolCall): Promise<ToolMessage> => {
    return executeCodeTask({ tool: executeTool, toolCall });
  };
}

const executeCodeTask = task(
  {
    name: "specialist:executeCode",
    retry: {
      maxAttempts: 2,
      retryOn: isRetryableError,
    },
  },
  async (params: {
    tool: StructuredToolInterface;
    toolCall: ToolCall;
  }): Promise<ToolMessage> => {
    const args = params.toolCall.args as { code: string; isMutating: boolean };
    const result = await params.tool.invoke(args);
    return new ToolMessage({
      content: typeof result === "string" ? result : JSON.stringify(result),
      tool_call_id: params.toolCall.id!,
    });
  },
);

export function createSpecialist(config: SpecialistConfig) {
  const prompt = loadPrompt(config.promptDir);

  return entrypoint(
    {
      name: `specialist-${config.name}`,
      checkpointer: config.checkpointer,
    },
    async (request: string): Promise<string> => {
      const { messages: initialMessages, config: promptConfig } =
        await compilePrompt(prompt, { request });

      const { model, executeTool } = createModelWithTools(promptConfig);

      const { response } = await runAgenticLoop({
        model,
        messages: initialMessages,
        invokeModel,
        invokeTool: createExecuteCodeTaskForTool(executeTool),
      });

      return response.text || "No response";
    },
  );
}
