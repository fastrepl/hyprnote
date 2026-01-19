import * as Sentry from "@sentry/bun";
import type { SayFn } from "@slack/bolt";
import type { WebClient } from "@slack/web-api";

import {
  agent,
  clearThread,
  generateRunId,
  getLangSmithUrl,
} from "@hypr/agent-internal";
import type { AgentInput, ToolApprovalInterrupt } from "@hypr/agent-internal";

import { env } from "../../env";
import {
  fetchReferencedSlackMessages,
  type ReferencedContent,
} from "../../utils/slack-message-reader";
import {
  ExitBlock,
  ExitBlockSimple,
  InterruptBlock,
  ProgressBlock,
  ResponseBlock,
  TerminateBlock,
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
  const command = text.trim().toUpperCase();
  return command === "EXIT" || command === "TERMINATE";
}

function isTerminateResponse(result: unknown): boolean {
  return typeof result === "string" && result.trim() === "TERMINATE";
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

    let finalResult: unknown;

    for await (const chunk of await agent.stream(agentInput, {
      runId,
      configurable: { thread_id: threadTs },
      metadata: {
        slack_channel: channel,
        slack_user: userId,
      },
      tags: ["slack-internal"],
      streamMode: ["values", "custom"],
    })) {
      const [mode, data] = chunk as unknown as [string, unknown];

      if (mode === "custom") {
        const customData = data as { type: string; name: string; task: string };
        if (customData.type === "subgraph") {
          await say({
            thread_ts: eventTs,
            blocks: ProgressBlock({
              name: customData.name,
              task: customData.task,
            }),
          });
        }
      } else if (mode === "values") {
        finalResult = data;
      }
    }

    if (isInterrupted(finalResult)) {
      const interruptData = finalResult.__interrupt__![0].value;
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

    if (isTerminateResponse(finalResult)) {
      await clearThread(threadTs);
      const langsmithUrl = getLangSmithUrl(threadTs);
      await say({
        thread_ts: eventTs,
        blocks: TerminateBlock({ langsmithUrl }),
      });
      return;
    }

    await say({
      thread_ts: eventTs,
      blocks: ResponseBlock(finalResult as string),
    });
  } catch (error) {
    logger.error("Agent error:", error);
    Sentry.withScope((scope) => {
      scope.setTag("slack_channel", channel);
      scope.setTag("slack_thread_ts", threadTs);
      if (userId) {
        scope.setTag("slack_user", userId);
      }
      scope.setContext("agent_message", {
        channel,
        threadTs,
        userId,
        isFirstMessage,
      });
      Sentry.captureException(error);
    });
    await say({
      thread_ts: eventTs,
      text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
    });
  }
}
