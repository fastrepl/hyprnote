import type {
  AIMessage,
  BaseMessage,
  ToolMessage,
} from "@langchain/core/messages";
import type { ToolCall } from "@langchain/core/messages/tool";
import { addMessages } from "@langchain/langgraph";

type TaskFunction<TArgs extends any[], TReturn> = (
  ...args: TArgs
) => Promise<TReturn> | Promise<Promise<TReturn>>;

export interface AgenticLoopConfig<TModel> {
  model: TModel;
  messages: BaseMessage[];
  invokeModel: TaskFunction<
    [{ model: TModel; messages: BaseMessage[] }],
    AIMessage
  >;
  invokeTool: TaskFunction<[ToolCall], ToolMessage>;
}

export interface AgenticLoopResult {
  response: AIMessage;
  messages: BaseMessage[];
}

async function unwrapPromise<T>(
  value: Promise<T> | Promise<Promise<T>>,
): Promise<T> {
  const result = await value;
  return result instanceof Promise ? await result : result;
}

export async function runAgenticLoop<TModel>(
  config: AgenticLoopConfig<TModel>,
): Promise<AgenticLoopResult> {
  const { model, invokeModel, invokeTool } = config;
  let messages = config.messages;
  let response = await unwrapPromise(invokeModel({ model, messages }));

  while (response.tool_calls?.length) {
    const toolResults = await Promise.all(
      response.tool_calls.map(
        async (tc) => await unwrapPromise(invokeTool(tc)),
      ),
    );
    messages = addMessages(messages, [response, ...toolResults]);
    response = await unwrapPromise(invokeModel({ model, messages }));
  }

  return { response, messages };
}
