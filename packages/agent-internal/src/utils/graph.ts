import type {
  AIMessage,
  BaseMessage,
  ToolMessage,
} from "@langchain/core/messages";
import type { ToolCall } from "@langchain/core/messages/tool";
import {
  Annotation,
  END,
  type LangGraphRunnableConfig,
  START,
  StateGraph,
} from "@langchain/langgraph";

type TaskFunction<TArgs extends unknown[], TReturn> = (
  ...args: TArgs
) => Promise<TReturn> | Promise<Promise<TReturn>>;

const AgentGraphAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (left, right) => left.concat(right),
    default: () => [],
  }),
  iterations: Annotation<number>({
    reducer: (_left, right) => right,
    default: () => 0,
  }),
});

type AgentGraphState = typeof AgentGraphAnnotation.State;

export interface AgentGraphConfig<TModel> {
  model: TModel;
  invokeModel: TaskFunction<
    [{ model: TModel; messages: BaseMessage[] }],
    AIMessage
  >;
  invokeTool: TaskFunction<[ToolCall], ToolMessage>;
  maxIterations?: number;
}

export interface AgentGraphResult {
  response: AIMessage;
  messages: BaseMessage[];
}

async function unwrapPromise<T>(
  value: Promise<T> | Promise<Promise<T>>,
): Promise<T> {
  const result = await value;
  return result instanceof Promise ? await result : result;
}

export function createAgentGraph<TModel>(config: AgentGraphConfig<TModel>) {
  const { model, invokeModel, invokeTool, maxIterations = 50 } = config;

  const callModelNode = async (
    state: AgentGraphState,
    _config: LangGraphRunnableConfig,
  ): Promise<Partial<AgentGraphState>> => {
    const response = await unwrapPromise(
      invokeModel({ model, messages: state.messages }),
    );
    return {
      messages: [response],
      iterations: state.iterations + 1,
    };
  };

  const callToolsNode = async (
    state: AgentGraphState,
    _config: LangGraphRunnableConfig,
  ): Promise<Partial<AgentGraphState>> => {
    const lastMessage = state.messages[state.messages.length - 1] as AIMessage;
    const toolCalls = lastMessage.tool_calls ?? [];

    const toolResults = await Promise.all(
      toolCalls.map(async (tc) => await unwrapPromise(invokeTool(tc))),
    );

    return { messages: toolResults };
  };

  const shouldContinue = (state: AgentGraphState): "callTools" | typeof END => {
    if (state.messages.length === 0) {
      console.warn("No messages in state, ending graph");
      return END;
    }

    const lastMessage = state.messages[state.messages.length - 1];

    if (lastMessage._getType() !== "ai") {
      console.warn(`Expected AIMessage, got ${lastMessage._getType()}`);
      return END;
    }

    const aiMessage = lastMessage as AIMessage;
    const hasToolCalls = (aiMessage.tool_calls?.length ?? 0) > 0;
    const maxReached = state.iterations >= maxIterations;

    if (hasToolCalls && !maxReached) {
      return "callTools";
    }
    return END;
  };

  const graph = new StateGraph(AgentGraphAnnotation)
    .addNode("callModel", callModelNode)
    .addNode("callTools", callToolsNode)
    .addEdge(START, "callModel")
    .addConditionalEdges("callModel", shouldContinue, {
      callTools: "callTools",
      [END]: END,
    })
    .addEdge("callTools", "callModel");

  return graph.compile();
}

export async function runAgentGraph<TModel>(
  config: AgentGraphConfig<TModel>,
  initialMessages: BaseMessage[],
): Promise<AgentGraphResult> {
  const graph = createAgentGraph(config);

  const result = await graph.invoke({
    messages: initialMessages,
    iterations: 0,
  });

  const response = result.messages[result.messages.length - 1] as AIMessage;

  return {
    response,
    messages: result.messages.slice(0, -1),
  };
}

export { AgentGraphAnnotation, type AgentGraphState };
