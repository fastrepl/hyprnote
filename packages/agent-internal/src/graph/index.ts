import { START, StateGraph } from "@langchain/langgraph";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

import { env } from "../env";
import { agentNode } from "../nodes/agent";
import { toolsNode } from "../nodes/tools";
import { AgentState } from "../state";
import { shouldContinue } from "./routing";

const checkpointer = PostgresSaver.fromConnString(env.DATABASE_URL);

export async function setupCheckpointer() {
  await checkpointer.setup();
}

export async function clearThread(threadId: string): Promise<void> {
  await checkpointer.deleteThread(threadId);
}

export { checkpointer };

const workflow = new StateGraph(AgentState)
  .addNode("agent", agentNode)
  .addNode("tools", toolsNode)
  .addEdge(START, "agent")
  .addConditionalEdges("agent", shouldContinue, {
    tools: "tools",
    __end__: "__end__",
  })
  .addEdge("tools", "agent");

export const graph = workflow.compile({
  checkpointer,
});

export type CompiledAgentGraph = typeof graph;
