import { AIMessage, ToolMessage } from "@langchain/core/messages";
import { Command, interrupt } from "@langchain/langgraph";

import {
  type AgentStateType,
  type HumanInterrupt,
  type HumanResponse,
  toolsRequiringApproval,
} from "@hypr/agent-core";

export async function humanApprovalNode(
  state: AgentStateType,
): Promise<Command> {
  if (!state.messages || state.messages.length === 0) {
    throw new Error("No messages in state");
  }

  const lastMessage = state.messages[state.messages.length - 1];

  if (!AIMessage.isInstance(lastMessage)) {
    throw new Error("Expected AIMessage with tool_calls");
  }

  const toolCalls = lastMessage.tool_calls ?? [];

  // Check if any tool calls require approval
  const toolsNeedingApproval = toolCalls.filter((toolCall) =>
    toolsRequiringApproval.has(toolCall.name),
  );

  if (toolsNeedingApproval.length === 0) {
    // No approval needed, proceed directly to tools
    return new Command({ goto: "tools" });
  }

  // Process each tool requiring approval
  for (const toolCall of toolsNeedingApproval) {
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
      // User ignored the tool call, go back to agent without feedback
      return new Command({ goto: "agent" });
    }

    if (response.type === "response" && typeof response.args === "string") {
      // User provided feedback, add it as a ToolMessage and go back to agent
      const feedbackMessage = new ToolMessage({
        content: `User feedback: ${response.args}`,
        tool_call_id: toolCall.id ?? "",
      });
      return new Command({
        goto: "agent",
        update: { messages: [feedbackMessage] },
      });
    }
  }

  // All approvals accepted, proceed to tools
  return new Command({ goto: "tools" });
}
