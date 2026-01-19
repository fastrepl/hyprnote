import { END, START, StateGraph } from "@langchain/langgraph";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { ToolNode } from "@langchain/langgraph/prebuilt";

import { env } from "../env";
import { agentNode } from "../nodes/agent";
import { humanApprovalNode } from "../nodes/tools";
import { AgentState } from "../state";
import { tools } from "../tools";
import { isRetryableError } from "../types";
import { shouldContinue } from "./routing";

const checkpointer = PostgresSaver.fromConnString(env.DATABASE_URL);

export async function setupCheckpointer() {
  await checkpointer.setup();
}

export async function clearThread(threadId: string): Promise<void> {
  await checkpointer.deleteThread(threadId);
}

export { checkpointer };

const toolNode = new ToolNode(tools);

const agentRetryPolicy = {
  maxAttempts: 3,
  initialInterval: 1000,
  backoffFactor: 2,
  retryOn: isRetryableError,
};

const workflow = new StateGraph(AgentState)
  .addNode("agent", agentNode, { retryPolicy: agentRetryPolicy })
  .addNode("humanApproval", humanApprovalNode, {
    ends: ["tools", "agent"],
  })
  .addNode("tools", toolNode)
  .addEdge(START, "agent")
  .addConditionalEdges("agent", shouldContinue, {
    humanApproval: "humanApproval",
    [END]: END,
  })
  .addEdge("tools", "agent");

export const graph = workflow.compile({
  checkpointer,
  recursionLimit: 50,
});

export type CompiledAgentGraph = typeof graph;
