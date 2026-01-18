import type { BaseCheckpointSaver } from "@langchain/langgraph";

export interface ToolApprovalInterrupt {
  type: "tool_approval";
  toolName: string;
  toolArgs: Record<string, unknown>;
}

export interface ApprovalDecision {
  approved: boolean;
  reason?: string;
}

export interface SpecialistConfig {
  name: string;
  promptDir: string;
  checkpointer?: BaseCheckpointSaver;
  getContext?: () => Promise<Record<string, unknown>>;
}

export function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();
  const retryablePatterns = [
    "rate limit",
    "rate_limit",
    "too many requests",
    "429",
    "timeout",
    "timed out",
    "econnreset",
    "econnrefused",
    "network",
    "socket hang up",
    "temporarily unavailable",
    "service unavailable",
    "503",
    "502",
    "504",
  ];

  return retryablePatterns.some((pattern) => message.includes(pattern));
}
