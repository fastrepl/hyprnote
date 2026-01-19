import { AIMessage } from "@langchain/core/messages";
import { END } from "@langchain/langgraph";

import type { AgentStateType } from "../state";

export function shouldContinue(state: AgentStateType): "tools" | typeof END {
  if (!state.messages || state.messages.length === 0) {
    return END;
  }

  const lastMessage = state.messages[state.messages.length - 1];

  if (AIMessage.isInstance(lastMessage)) {
    const toolCalls = lastMessage.tool_calls ?? [];
    if (toolCalls.length > 0) {
      return "tools";
    }
  }

  return END;
}
