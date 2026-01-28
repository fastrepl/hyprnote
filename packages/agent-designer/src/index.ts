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

// Tools (designer-specific tools + re-exports from core)
export {
  magicPatternsTool,
  readUrlTool,
  registerTool,
  tools,
  toolsByName,
  toolsRequiringApproval,
} from "./tools";
