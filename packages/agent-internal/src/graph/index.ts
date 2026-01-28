import { END, START, StateGraph } from "@langchain/langgraph";
import { ToolNode, toolsCondition } from "@langchain/langgraph/prebuilt";

import {
  AgentState,
  checkpointer,
  clearThread,
  isRetryableError,
  setupCheckpointer,
} from "@hypr/agent-core";

import { agentNode } from "../nodes/agent";
import { humanApprovalNode } from "../nodes/tools";
import { tools } from "../tools";

export { checkpointer, clearThread, setupCheckpointer };

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
  .addConditionalEdges("agent", toolsCondition, {
    tools: "humanApproval",
    [END]: END,
  })
  .addEdge("tools", "agent");

export const graph = workflow.compile({
  checkpointer,
});

export type CompiledAgentGraph = typeof graph;
