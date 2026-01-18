import type { BaseMessage } from "@langchain/core/messages";
import { ToolMessage } from "@langchain/core/messages";
import type { ToolCall } from "@langchain/core/messages/tool";
import {
  addMessages,
  entrypoint,
  getPreviousState,
  interrupt,
  task,
} from "@langchain/langgraph";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { ChatOpenAI } from "@langchain/openai";

import { env } from "../env";
import { compilePrompt, loadPrompt, type PromptConfig } from "./prompt";
import { tools, toolsByName, toolsRequiringApproval } from "./tools";
import {
  type ApprovalDecision,
  isRetryableError,
  type ToolApprovalInterrupt,
} from "./types";
import { type AgentInput, parseRequest } from "./utils/input";
import { runAgenticLoop } from "./utils/loop";

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
      const interruptValue: ToolApprovalInterrupt = {
        type: "tool_approval",
        toolName: toolCall.name,
        toolArgs: toolCall.args,
      };
      const decision = interrupt(interruptValue) as ApprovalDecision;

      if (!decision.approved) {
        return new ToolMessage({
          content: `Tool execution rejected: ${decision.reason ?? "No reason provided"}`,
          tool_call_id: toolCall.id!,
        });
      }
    }

    const result = await tool.invoke(toolCall.args);
    return new ToolMessage({
      content: typeof result === "string" ? result : JSON.stringify(result),
      tool_call_id: toolCall.id!,
    });
  },
);

export const agent = entrypoint(
  { checkpointer, name: "agent" },
  async (input: AgentInput) => {
    const request = parseRequest(input);
    const previous = getPreviousState<BaseMessage[]>();
    let messages = previous ?? [];
    const { messages: promptMessages, config } = await compilePrompt(prompt, {
      request,
    });
    messages = addMessages(messages, promptMessages);

    const model = createModel(config);

    const { response, messages: finalMessages } = await runAgenticLoop({
      model,
      messages,
      invokeModel: callModel,
      invokeTool: callTool,
    });

    const allMessages = addMessages(finalMessages, [response]);

    return entrypoint.final({
      value: response.text || "No response",
      save: allMessages,
    });
  },
);
