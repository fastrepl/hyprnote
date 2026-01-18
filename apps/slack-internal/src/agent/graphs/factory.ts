import { AIMessage, BaseMessage, ToolMessage } from "@langchain/core/messages";
import type { ToolCall } from "@langchain/core/messages/tool";
import { tool } from "@langchain/core/tools";
import { addMessages, entrypoint, interrupt, task } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

import { env } from "../../env";
import { executeCode } from "../../modal/execute";
import { compilePrompt, loadPrompt } from "../prompt";

interface SubgraphConfig {
  name: string;
  toolName: string;
  toolDescription: string;
  promptDir: string;
}

export function createSubgraph(config: SubgraphConfig) {
  const prompt = loadPrompt(config.promptDir);

  const model = new ChatOpenAI({
    model: "anthropic/claude-opus-4.5",
    temperature: 0,
    configuration: {
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: env.OPENROUTER_API_KEY,
    },
  });

  const executeTool = tool(
    async ({ code }: { code: string }) => {
      const result = await executeCode(code);
      return JSON.stringify(result);
    },
    {
      name: config.toolName,
      description: config.toolDescription,
      schema: z.object({
        code: z.string().describe("The code to execute"),
      }),
    },
  );

  const modelWithTools = model.bindTools([executeTool]);

  const callModel = task(
    `call${config.name}Model`,
    async (messages: BaseMessage[]) => {
      return modelWithTools.invoke(messages);
    },
  );

  const callTool = task(
    `call${config.name}Tool`,
    async (toolCall: ToolCall) => {
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

      const result = await executeTool.invoke(
        toolCall.args as { code: string },
      );
      return new ToolMessage({
        content: typeof result === "string" ? result : JSON.stringify(result),
        tool_call_id: toolCall.id!,
      });
    },
  );

  return entrypoint(
    { name: `${config.name}Graph` },
    async (request: string) => {
      let messages: BaseMessage[] = await compilePrompt(prompt, { request });
      let response = await callModel(messages);

      while (response.tool_calls?.length) {
        const toolResults = await Promise.all(
          response.tool_calls.map(callTool),
        );
        messages = addMessages(messages, [response, ...toolResults]);
        response = await callModel(messages);
      }

      return response instanceof AIMessage
        ? (response.content as string)
        : "No response";
    },
  );
}
