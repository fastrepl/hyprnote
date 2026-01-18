import { AIMessage, BaseMessage, ToolMessage } from "@langchain/core/messages";
import type { ToolCall } from "@langchain/core/messages/tool";
import { tool } from "@langchain/core/tools";
import { addMessages, entrypoint, interrupt, task } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

import { env } from "../../../env";
import { executeCode } from "../../../modal/execute";
import { compilePrompt, loadPrompt } from "../../prompt";

const prompt = loadPrompt(import.meta.dirname);

const model = new ChatOpenAI({
  model: "anthropic/claude-opus-4.5",
  temperature: 0,
  configuration: {
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: env.OPENROUTER_API_KEY,
  },
});

const executeSupabaseCodeTool = tool(
  async ({ code }: { code: string }) => {
    const result = await executeCode(code);
    return JSON.stringify(result);
  },
  {
    name: "executeSupabaseCode",
    description: "Execute TypeScript/JavaScript code to interact with Supabase",
    schema: z.object({
      code: z.string().describe("The code to execute"),
    }),
  },
);

const tools = [executeSupabaseCodeTool];
const modelWithTools = model.bindTools(tools);

const callModel = task("callSupabaseModel", async (messages: BaseMessage[]) => {
  return modelWithTools.invoke(messages);
});

const callTool = task("callSupabaseTool", async (toolCall: ToolCall) => {
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

  const result = await executeSupabaseCodeTool.invoke(
    toolCall.args as { code: string },
  );
  return new ToolMessage({
    content: typeof result === "string" ? result : JSON.stringify(result),
    tool_call_id: toolCall.id!,
  });
});

export const supabaseGraph = entrypoint(
  { name: "supabaseGraph" },
  async (request: string) => {
    let messages: BaseMessage[] = await compilePrompt(prompt, { request });

    let response = await callModel(messages);

    while (response.tool_calls?.length) {
      const toolResults = await Promise.all(response.tool_calls.map(callTool));
      messages = addMessages(messages, [response, ...toolResults]);
      response = await callModel(messages);
    }

    const content =
      response instanceof AIMessage
        ? (response.content as string)
        : "No response";

    return content;
  },
);
