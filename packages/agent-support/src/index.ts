// Re-export everything from agent-core for backwards compatibility
export * from "@hypr/agent-core";

// Main agent exports
export { agent } from "./agent";

// Graph exports
export { graph } from "./graph";
export type { CompiledAgentGraph } from "./graph";

// Tools (internal-specific tools + re-exports from core)
export {
  executeCodeTool,
  loopsTool,
  readUrlTool,
  registerTool,
  stripeTool,
  supabaseTool,
  tools,
  toolsByName,
  toolsRequiringApproval,
} from "./tools";

// Specialists
export { createSpecialist } from "./specialists/factory";
export { loopsSpecialist } from "./specialists/loops";
export { posthogSpecialist } from "./specialists/posthog";
export { stripeSpecialist } from "./specialists/stripe";
export { supabaseSpecialist } from "./specialists/supabase";

// Modal
export type { ExecutionResult } from "./modal/execute";
export { executeCode } from "./modal/execute";
export type { BunSandbox, SandboxRunResult } from "./modal/sandbox";
export {
  createBunSandbox,
  REPO_PATH,
  runInSandbox,
  sandboxManager,
  terminateSandbox,
} from "./modal/sandbox";
export type { UnderstandResult } from "./modal/understand";
export { understandHyprnoteRepo } from "./modal/understand";
