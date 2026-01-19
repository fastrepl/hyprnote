import { env } from "./env";
import { checkpointer, clearThread, graph, setupCheckpointer } from "./graph";

process.env.LANGSMITH_TRACING = env.LANGSMITH_API_KEY ? "true" : "false";

export function generateRunId(): string {
  return crypto.randomUUID();
}

export function getLangSmithUrl(threadId: string): string | null {
  if (!env.LANGSMITH_API_KEY || !env.LANGSMITH_ORG_ID) return null;
  return `https://smith.langchain.com/o/${env.LANGSMITH_ORG_ID}/projects/p/${env.LANGSMITH_PROJECT}?peekedConversationId=${threadId}`;
}

export { checkpointer, clearThread, setupCheckpointer };

// Export the compiled graph directly for LangGraph Studio compatibility
export const agent = graph;
