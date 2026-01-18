import { AIMessage, BaseMessage, ToolMessage } from "@langchain/core/messages";
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
import { compilePrompt, loadPrompt } from "./prompt";
import { tools, toolsByName, toolsRequiringApproval } from "./tools";

process.env.LANGSMITH_TRACING = env.LANGSMITH_API_KEY ? "true" : "false";

const prompt = loadPrompt(import.meta.dirname);

const model = new ChatOpenAI({
  model: "anthropic/claude-opus-4.5",
  temperature: 0,
  configuration: {
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: env.OPENROUTER_API_KEY,
  },
}).bindTools(tools);

const checkpointer = PostgresSaver.fromConnString(env.DATABASE_URL);

export async function setupCheckpointer() {
  await checkpointer.setup();
}

const callModel = task("callModel", async (messages: BaseMessage[]) => {
  return model.invoke(messages);
});

const callTool = task("callTool", async (toolCall: ToolCall) => {
  const tool = toolsByName[toolCall.name];
  if (!tool) {
    return new ToolMessage({
      content: `Unknown tool: ${toolCall.name}`,
      tool_call_id: toolCall.id!,
    });
  }

  if (toolsRequiringApproval.has(toolCall.name)) {
    const decision = interrupt({
      type: "tool_approval",
      toolName: toolCall.name,
      toolArgs: toolCall.args,
    }) as { approved: boolean; reason?: string };

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
});

export const agent = entrypoint(
  { checkpointer, name: "agent" },
  async (input: string) => {
    const previous = getPreviousState<BaseMessage[]>();
    let messages = previous ?? [];
    const promptMessages = await compilePrompt(prompt, { request: input });
    messages = addMessages(messages, promptMessages);

    let response = await callModel(messages);

    while (response.tool_calls?.length) {
      const toolResults = await Promise.all(response.tool_calls.map(callTool));
      messages = addMessages(messages, [response, ...toolResults]);
      response = await callModel(messages);
    }

    messages = addMessages(messages, [response]);

    const content =
      response instanceof AIMessage
        ? (response.content as string)
        : "No response";

    return entrypoint.final({ value: content, save: messages });
  },
);
