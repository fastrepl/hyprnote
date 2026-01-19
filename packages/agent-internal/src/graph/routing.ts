import type { AgentStateType } from "../state";

export function shouldContinue(state: AgentStateType): "tools" | "__end__" {
  const lastMessage = state.messages[state.messages.length - 1];

  if (lastMessage._getType() === "ai") {
    const aiMessage = lastMessage as { tool_calls?: unknown[] };
    if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
      return "tools";
    }
  }

  return "__end__";
}
