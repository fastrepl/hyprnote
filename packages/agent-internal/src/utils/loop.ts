import type {
  AIMessage,
  BaseMessage,
  ToolMessage,
} from "@langchain/core/messages";
import type { ToolCall } from "@langchain/core/messages/tool";

type TaskFunction<TArgs extends unknown[], TReturn> = (
  ...args: TArgs
) => Promise<TReturn> | Promise<Promise<TReturn>>;

export interface AgentLoopConfig<TModel> {
  model: TModel;
  invokeModel: TaskFunction<
    [{ model: TModel; messages: BaseMessage[] }],
    AIMessage
  >;
  invokeTool: TaskFunction<[ToolCall], ToolMessage>;
  maxIterations?: number;
}

export interface AgentLoopResult {
  response: AIMessage;
  messages: BaseMessage[];
}

async function unwrapPromise<T>(
  value: Promise<T> | Promise<Promise<T>>,
): Promise<T> {
  const result = await value;
  return result instanceof Promise ? await result : result;
}

export async function runAgentLoop<TModel>(
  config: AgentLoopConfig<TModel>,
  initialMessages: BaseMessage[],
): Promise<AgentLoopResult> {
  const { model, invokeModel, invokeTool, maxIterations = 50 } = config;

  let messages = [...initialMessages];
  let iterations = 0;

  while (iterations < maxIterations) {
    const response = await unwrapPromise(invokeModel({ model, messages }));
    iterations++;

    const hasToolCalls = (response.tool_calls?.length ?? 0) > 0;
    if (!hasToolCalls) {
      return { response, messages };
    }

    messages = [...messages, response];

    const toolResults = await Promise.all(
      (response.tool_calls ?? []).map(
        async (tc) => await unwrapPromise(invokeTool(tc)),
      ),
    );

    messages = [...messages, ...toolResults];
  }

  const lastMessage = messages[messages.length - 1];
  if (lastMessage._getType() === "ai") {
    return {
      response: lastMessage as AIMessage,
      messages: messages.slice(0, -1),
    };
  }

  throw new Error(`Max iterations (${maxIterations}) reached without response`);
}
