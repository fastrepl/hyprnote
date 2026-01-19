import type { BaseCheckpointSaver, Pregel } from "@langchain/langgraph";
import type {
  HumanInterrupt,
  HumanResponse,
} from "@langchain/langgraph/prebuilt";

export type { HumanInterrupt, HumanResponse };

export type AgentGraph<Input = unknown, Output = unknown> = Pregel<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any,
  Record<string, unknown>,
  Input,
  Output
>;

export interface AgentOutput {
  output: string;
}

export interface AgentStreamState {
  agent?: AgentOutput;
  __interrupt__?: Array<{ value: HumanInterrupt }>;
}

export function isInterrupted(
  state: AgentStreamState,
): state is AgentStreamState & {
  __interrupt__: Array<{ value: HumanInterrupt }>;
} {
  return (
    "__interrupt__" in state &&
    Array.isArray(state.__interrupt__) &&
    state.__interrupt__.length > 0
  );
}

export function extractOutput(state: AgentStreamState): string | undefined {
  return state.agent?.output;
}

export function getInterruptToolName(interrupt: HumanInterrupt): string {
  return interrupt.action_request.action;
}

export function getInterruptToolArgs(
  interrupt: HumanInterrupt,
): Record<string, unknown> {
  return interrupt.action_request.args;
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
