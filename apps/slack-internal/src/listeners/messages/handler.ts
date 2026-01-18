import type { SayFn } from "@slack/bolt";
import type { WebClient } from "@slack/web-api";

import {
  agent,
  clearThread,
  generateRunId,
  getLangSmithUrl,
} from "../../agent";
import type { ToolApprovalInterrupt } from "../../agent/types";
import type { AgentInput } from "../../agent/utils/input";
import { env } from "../../env";
import { sandboxManager } from "../../modal/sandbox";
import {
  fetchReferencedSlackMessages,
  type ReferencedContent,
} from "../../utils/slack-message-reader";
import {
  ExitBlock,
  ExitBlockSimple,
  InterruptBlock,
  ResponseBlock,
  WelcomeBlock,
} from "./blocks";

interface AgentResult {
  __interrupt__?: Array<{ value: ToolApprovalInterrupt }>;
}

function isInterrupted(result: unknown): result is AgentResult {
  return (
    typeof result === "object" &&
    result !== null &&
    "__interrupt__" in result &&
    Array.isArray((result as AgentResult).__interrupt__)
  );
}

export function shouldIgnoreMessage(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.startsWith("!aside")) return true;
  if (/^\(aside\)/i.test(trimmed)) return true;
  if (/^\(aside\s*\)/i.test(trimmed)) return true;
  return false;
}

function isExitCommand(text: string): boolean {
  return text.trim().toUpperCase() === "EXIT";
}

function buildAgentInput(
  text: string,
  referencedContent: ReferencedContent[],
): AgentInput {
  const images = referencedContent.flatMap((c) =>
    c.images.map((img) => ({ base64: img.base64, mimeType: img.mimeType })),
  );

  if (referencedContent.length === 0) {
    return { request: text, images };
  }

  const textParts = referencedContent.map((c) => c.text);
  const request = `${text}\n\n--- Referenced Slack Content ---\n${textParts.join("\n\n---\n\n")}`;

  return { request, images };
}

async function fetchReferencedContent(
  client: WebClient,
  text: string,
): Promise<ReferencedContent[]> {
  return fetchReferencedSlackMessages(client, text, env.SLACK_BOT_TOKEN);
}

interface Logger {
  error: (message: string, ...args: unknown[]) => void;
}

export interface AgentMessageContext {
  text: string;
  rawText: string;
  threadTs: string;
  eventTs: string;
  channel: string;
  userId?: string;
  isFirstMessage: boolean;
  useSimpleExitBlock?: boolean;
  client: WebClient;
  say: SayFn;
  logger: Logger;
}

export async function handleAgentMessage(
  ctx: AgentMessageContext,
): Promise<void> {
  const {
    text,
    rawText,
    threadTs,
    eventTs,
    channel,
    userId,
    isFirstMessage,
    useSimpleExitBlock,
    client,
    say,
    logger,
  } = ctx;

  try {
    if (isExitCommand(text)) {
      await clearThread(threadTs);
      await sandboxManager.release(threadTs);
      await say({
        thread_ts: eventTs,
        blocks: useSimpleExitBlock ? ExitBlockSimple() : ExitBlock(),
      });
      return;
    }

    const runId = generateRunId();

    if (isFirstMessage) {
      const langsmithUrl = getLangSmithUrl(threadTs);
      await say({
        thread_ts: eventTs,
        blocks: WelcomeBlock({ langsmithUrl }),
      });
    }

    const referencedMessages = await fetchReferencedContent(client, rawText);
    const agentInput = buildAgentInput(text, referencedMessages);

    const result = await agent.invoke(agentInput, {
      runId,
      configurable: { thread_id: threadTs },
      metadata: {
        slack_channel: channel,
        slack_user: userId,
      },
      tags: ["slack-internal"],
    });

    if (isInterrupted(result)) {
      const interruptData = result.__interrupt__![0].value;
      await say({
        thread_ts: eventTs,
        blocks: InterruptBlock({
          toolName: interruptData.toolName,
          toolArgs: interruptData.toolArgs,
          threadTs,
        }),
      });
      return;
    }

    await say({
      thread_ts: eventTs,
      blocks: ResponseBlock(result as string),
    });
  } catch (error) {
    logger.error("Agent error:", error);
    await say({
      thread_ts: eventTs,
      text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
    });
  }
}
