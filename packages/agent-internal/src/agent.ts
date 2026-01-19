import type { BaseMessage } from "@langchain/core/messages";
import { ToolMessage } from "@langchain/core/messages";
import type { ToolCall } from "@langchain/core/messages/tool";
import {
  addMessages,
  entrypoint,
  getConfig,
  getPreviousState,
  interrupt,
  task,
} from "@langchain/langgraph";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { ChatOpenAI } from "@langchain/openai";

import { env } from "./env";
import { compilePrompt, loadPrompt, type PromptConfig } from "./prompt";
import { tools, toolsByName, toolsRequiringApproval } from "./tools";
import {
  type AgentGraph,
  type AgentOutput,
  type HumanInterrupt,
  type HumanResponse,
  isRetryableError,
} from "./types";
import { compressMessages } from "./utils/context";
import { type AgentInput, getImages, parseRequest } from "./utils/input";
import { runAgentLoop } from "./utils/loop";

process.env.LANGSMITH_TRACING = env.LANGSMITH_API_KEY ? "true" : "false";

export function generateRunId(): string {
  return crypto.randomUUID();
}

export function getLangSmithUrl(threadId: string): string | null {
  if (!env.LANGSMITH_API_KEY || !env.LANGSMITH_ORG_ID) return null;
  return `https://smith.langchain.com/o/${env.LANGSMITH_ORG_ID}/projects/p/${env.LANGSMITH_PROJECT}?peekedConversationId=${threadId}`;
}

const prompt = loadPrompt(import.meta.dirname);

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

const checkpointer = PostgresSaver.fromConnString(env.DATABASE_URL);

export async function setupCheckpointer() {
  await checkpointer.setup();
}

export async function clearThread(threadId: string): Promise<void> {
  await checkpointer.deleteThread(threadId);
}

export { checkpointer };

type ModelWithTools = ReturnType<typeof createModel>;

const callModel = task(
  {
    name: "agent:callModel",
    retry: {
      maxAttempts: 3,
      retryOn: isRetryableError,
      initialInterval: 1000,
    },
  },
  async (params: { model: ModelWithTools; messages: BaseMessage[] }) => {
    return params.model.invoke(params.messages);
  },
);

const callTool = task(
  {
    name: "agent:callTool",
    retry: {
      maxAttempts: 2,
      retryOn: isRetryableError,
      initialInterval: 1000,
    },
  },
  async (toolCall: ToolCall) => {
    const tool = toolsByName[toolCall.name];
    if (!tool) {
      return new ToolMessage({
        content: `Unknown tool: ${toolCall.name}`,
        tool_call_id: toolCall.id!,
      });
    }

    if (toolsRequiringApproval.has(toolCall.name)) {
      const interruptValue: HumanInterrupt = {
        action_request: {
          action: toolCall.name,
          args: toolCall.args as Record<string, unknown>,
        },
        config: {
          allow_accept: true,
          allow_ignore: true,
          allow_respond: true,
          allow_edit: false,
        },
        description: `Approve execution of tool: ${toolCall.name}`,
      };
      const response = interrupt(interruptValue) as HumanResponse;

      if (response.type === "ignore") {
        return new ToolMessage({
          content: "Tool execution skipped by user",
          tool_call_id: toolCall.id!,
        });
      }

      if (response.type === "response" && typeof response.args === "string") {
        return new ToolMessage({
          content: `User feedback: ${response.args}`,
          tool_call_id: toolCall.id!,
        });
      }
    }

    try {
      const config = getConfig();
      const result = await tool.invoke(toolCall.args, config);
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
      console.error(`Tool ${toolCall.name} failed:`, errorMessage);
      return new ToolMessage({
        content: `Tool execution failed: ${errorMessage}`,
        tool_call_id: toolCall.id!,
      });
    }
  },
);

export const agent: AgentGraph<AgentInput, AgentOutput> = entrypoint(
  { checkpointer, name: "agent" },
  async (input: AgentInput) => {
    const request = parseRequest(input);
    const images = getImages(input);
    const previous = getPreviousState<BaseMessage[]>();
    let messages = await compressMessages(previous ?? []);
    const { messages: promptMessages, config } = await compilePrompt(
      prompt,
      { request },
      images,
    );
    messages = addMessages(messages, promptMessages);

    const model = createModel(config);

    const { response, messages: finalMessages } = await runAgentLoop(
      {
        model,
        invokeModel: callModel,
        invokeTool: callTool,
      },
      messages,
    );

    const allMessages = addMessages(finalMessages, [response]);

    return entrypoint.final({
      value: { output: response.text || "No response" },
      save: allMessages,
    });
  },
);
