// Re-export everything from agent-core for backwards compatibility
export {
  AgentState,
  type AgentStateType,
  type AgentStreamState,
  checkpointer,
  clearThread,
  type CompiledPrompt,
  compilePrompt,
  compressMessages,
  createAgentGraph,
  createAgentNode,
  createModel,
  ensureMessageIds,
  extractOutput,
  generateRunId,
  getImages,
  getInterruptToolArgs,
  getInterruptToolName,
  getLangSmithUrl,
  humanApprovalNode,
  type HumanInterrupt,
  type HumanResponse,
  type ImageContent,
  isInterrupted,
  isRetryableError,
  loadPrompt,
  parseRequest,
  type PromptConfig,
  setupCheckpointer,
  type SpecialistConfig,
} from "@hypr/agent-core";

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
