import { AIMessage } from "@langchain/core/messages";
import { Command, interrupt } from "@langchain/langgraph";
import type {
  HumanInterrupt,
  HumanResponse,
} from "@langchain/langgraph/prebuilt";

import type { AgentStateType } from "../state";
import { toolsRequiringApproval } from "../tools";

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

    // If user ignores or responds with feedback, go back to agent
    if (response.type === "ignore" || response.type === "response") {
      return new Command({ goto: "agent" });
    }
  }

  // All approvals accepted, proceed to tools
  return new Command({ goto: "tools" });
}
