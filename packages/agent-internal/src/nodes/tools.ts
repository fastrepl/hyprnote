import { ToolMessage } from "@langchain/core/messages";
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
): Promise<Partial<AgentStateType>> {
  const lastMessage = state.messages[state.messages.length - 1];

  if (lastMessage._getType() !== "ai" || !("tool_calls" in lastMessage)) {
    throw new Error("Expected AIMessage with tool_calls");
  }

  const toolCalls =
    (
      lastMessage as {
        tool_calls?: Array<{
          id: string;
          name: string;
          args: Record<string, unknown>;
        }>;
      }
    ).tool_calls ?? [];

  // Process tools sequentially to avoid duplicate execution when resuming from interrupt
  // If we used Promise.all, tools without approval would execute while waiting for approval,
  // and then re-execute when the graph resumes after the interrupt
  const toolMessages: ToolMessage[] = [];

  for (const toolCall of toolCalls) {
    const tool = toolsByName[toolCall.name];

    if (!tool) {
      toolMessages.push(
        new ToolMessage({
          content: `Unknown tool: ${toolCall.name}`,
          tool_call_id: toolCall.id,
        }),
      );
      continue;
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
        toolMessages.push(
          new ToolMessage({
            content: "Tool execution skipped by user",
            tool_call_id: toolCall.id,
          }),
        );
        continue;
      }

      if (response.type === "response" && typeof response.args === "string") {
        toolMessages.push(
          new ToolMessage({
            content: `User feedback: ${response.args}`,
            tool_call_id: toolCall.id,
          }),
        );
        continue;
      }
    }

    let attempts = 0;
    const maxAttempts = 2;
    let toolMessage: ToolMessage | null = null;

    while (attempts < maxAttempts) {
      try {
        const result = await tool.invoke(toolCall.args);
        toolMessage = new ToolMessage({
          content: typeof result === "string" ? result : JSON.stringify(result),
          tool_call_id: toolCall.id,
        });
        break;
      } catch (error) {
        attempts++;
        if (!isRetryableError(error) || attempts >= maxAttempts) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          console.error(`Tool ${toolCall.name} failed:`, errorMessage);
          toolMessage = new ToolMessage({
            content: `Tool execution failed: ${errorMessage}`,
            tool_call_id: toolCall.id,
          });
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    if (!toolMessage) {
      toolMessage = new ToolMessage({
        content: "Tool execution failed after retries",
        tool_call_id: toolCall.id,
      });
    }

    toolMessages.push(toolMessage);
  }

  return {
    messages: toolMessages,
  };
}
