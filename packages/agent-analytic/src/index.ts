// Re-export everything from agent-core for backwards compatibility
export * from "@hypr/agent-core";

// Main agent exports
export { agent } from "./agent";

// Graph exports
export { graph } from "./graph";
export type { CompiledAgentGraph } from "./graph";

// Tools (analytic-specific tools + re-exports from support)
export {
  posthogTool,
  readUrlTool,
  registerTool,
  stripeTool,
  supabaseTool,
  tools,
  toolsByName,
  toolsRequiringApproval,
} from "./tools";

// Re-export PostHog client for backwards compatibility
export { PostHog } from "posthog-node";
export type { PostHogOptions } from "posthog-node";
