import { AIMessage, ToolMessage } from "@langchain/core/messages";
import type { RunnableConfig } from "@langchain/core/runnables";
import { interrupt } from "@langchain/langgraph";
import type {
  HumanInterrupt,
  HumanResponse,
} from "@langchain/langgraph/prebuilt";

import type { AgentStateType } from "../state";
import { toolsByName, toolsRequiringApproval } from "../tools";
import { isRetryableError } from "../types";

export async function toolsNode(
  state: AgentStateType,
  config?: RunnableConfig,
): Promise<Partial<AgentStateType>> {
  if (!state.messages || state.messages.length === 0) {
    throw new Error("No messages in state");
  }

  const lastMessage = state.messages[state.messages.length - 1];

  if (!AIMessage.isInstance(lastMessage)) {
    throw new Error("Expected AIMessage with tool_calls");
  }

  const toolCalls = lastMessage.tool_calls ?? [];

  const toolMessages = await Promise.all(
    toolCalls.map(async (toolCall) => {
      const tool = toolsByName[toolCall.name];
      const toolCallId = toolCall.id ?? "";

      if (!tool) {
        return new ToolMessage({
          content: `Unknown tool: ${toolCall.name}`,
          tool_call_id: toolCallId,
        });
      }

      if (toolsRequiringApproval.has(toolCall.name)) {
        const interruptValue: HumanInterrupt = {
          action_request: {
            action: toolCall.name,
            args: toolCall.args,
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
            tool_call_id: toolCallId,
          });
        }

        if (response.type === "response" && typeof response.args === "string") {
          return new ToolMessage({
            content: `User feedback: ${response.args}`,
            tool_call_id: toolCallId,
          });
        }
      }

      const maxAttempts = 2;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const result = await tool.invoke(toolCall.args, config);
          return new ToolMessage({
            content:
              typeof result === "string" ? result : JSON.stringify(result),
            tool_call_id: toolCallId,
          });
        } catch (error) {
          if (!isRetryableError(error) || attempt >= maxAttempts) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            console.error(`Tool ${toolCall.name} failed:`, errorMessage);
            return new ToolMessage({
              content: `Tool execution failed: ${errorMessage}`,
              tool_call_id: toolCallId,
            });
          }
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }
      }

      return new ToolMessage({
        content: "Tool execution failed after retries",
        tool_call_id: toolCallId,
      });
    }),
  );

  return {
    messages: toolMessages,
  };
}
