import {
  AIMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";
import {
  END,
  MessagesAnnotation,
  START,
  StateGraph,
} from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";

import { env } from "../env";
import { executeCodeTool } from "./tools/execute-code";

const model = new ChatOpenAI({
  model: "anthropic/claude-opus-4.5",
  temperature: 0,
  configuration: {
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: env.OPENROUTER_API_KEY,
  },
});

const tools = [executeCodeTool];
const modelWithTools = model.bindTools(tools);
const toolNode = new ToolNode(tools);

async function llmCall(state: typeof MessagesAnnotation.State) {
  const systemMessage = new SystemMessage(
    "You are a helpful assistant that can execute code. When asked to run or write code, use the executeCode tool.",
  );
  const response = await modelWithTools.invoke([
    systemMessage,
    ...state.messages,
  ]);
  return { messages: [response] };
}

function shouldContinue(state: typeof MessagesAnnotation.State) {
  const lastMessage = state.messages.at(-1);

  if (!lastMessage || !(lastMessage instanceof AIMessage)) {
    return END;
  }

  if (lastMessage.tool_calls?.length) {
    return "tools";
  }

  return END;
}

export const agent = new StateGraph(MessagesAnnotation)
  .addNode("llmCall", llmCall)
  .addNode("tools", toolNode)
  .addEdge(START, "llmCall")
  .addConditionalEdges("llmCall", shouldContinue, ["tools", END])
  .addEdge("tools", "llmCall")
  .compile();

export async function runAgent(prompt: string) {
  const result = await agent.invoke({
    messages: [new HumanMessage(prompt)],
  });

  const lastMessage = result.messages.at(-1);
  const text =
    lastMessage instanceof AIMessage
      ? (lastMessage.content as string)
      : "No response";

  const steps = result.messages
    .filter((m): m is AIMessage => m instanceof AIMessage)
    .map((m) => ({
      toolCalls: (m.tool_calls ?? []).map((tc) => ({ toolName: tc.name })),
    }));

  return { text, steps };
}
