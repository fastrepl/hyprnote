import type { RunnableConfig } from "@langchain/core/runnables";
import type { IterableReadableStream } from "@langchain/core/utils/stream";
import type {
  BaseCheckpointSaver,
  Command,
  Pregel,
} from "@langchain/langgraph";

export type { Pregel };

export type StreamMode = "values" | "custom" | "updates" | "messages" | "debug";

export interface StreamConfig extends RunnableConfig {
  streamMode?: StreamMode | StreamMode[];
}

export type StreamChunk = [string, unknown] | Record<string, unknown>;

export interface CompiledGraph<TInput, TOutput> {
  invoke(input: TInput | Command, config?: RunnableConfig): Promise<TOutput>;
  stream(
    input: TInput | Command,
    config?: StreamConfig,
  ): Promise<IterableReadableStream<StreamChunk>>;
}

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

  const nonRetryablePatterns = [
    "401",
    "403",
    "unauthorized",
    "forbidden",
    "400",
    "bad request",
    "404",
    "not found",
  ];

  if (nonRetryablePatterns.some((pattern) => message.includes(pattern))) {
    return false;
  }

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
