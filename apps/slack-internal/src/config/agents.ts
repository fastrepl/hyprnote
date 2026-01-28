import type { CompiledAgentGraph } from "@hypr/agent-internal";
import { agent as internalAgent } from "@hypr/agent-internal";

export interface AgentConfig {
  agent: CompiledAgentGraph;
  name: string;
  description: string;
}

export const agents = {
  internal: {
    agent: internalAgent,
    name: "Internal Ops Agent",
    description: "Handles internal operations, Stripe, Loops, Supabase",
  },
} as const satisfies Record<string, AgentConfig>;

export type AgentType = keyof typeof agents;

const channelAgentMap: Record<string, AgentType> = {};

const defaultAgent: AgentType = "internal";

export function setChannelAgent(channelId: string, agentType: AgentType): void {
  channelAgentMap[channelId] = agentType;
}

export function getAgentForChannel(channelId: string): AgentConfig {
  const agentType = channelAgentMap[channelId] ?? defaultAgent;
  return agents[agentType];
}

export function getAgentTypeForChannel(channelId: string): AgentType {
  return channelAgentMap[channelId] ?? defaultAgent;
}
