/** @jsxImportSource jsx-slack */
import type { App } from "@slack/bolt";
import type { KnownBlock } from "@slack/types";
import type { WebClient } from "@slack/web-api";
import { Actions, Blocks, Button, Section } from "jsx-slack";

import {
  agent,
  clearThread,
  generateRunId,
  getLangSmithUrl,
} from "../../agent";
import { env } from "../../env";
import { fetchReferencedSlackMessages } from "../../utils/slack-message-reader";

function shouldIgnoreMessage(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.startsWith("!aside")) return true;
  if (/^\(aside\)/i.test(trimmed)) return true;
  if (/^\(aside\s*\)/i.test(trimmed)) return true;
  return false;
}

function isExitCommand(text: string): boolean {
  return text.trim().toUpperCase() === "EXIT";
}

interface InterruptValue {
  type: string;
  toolName: string;
  toolArgs: Record<string, unknown>;
}

interface AgentResult {
  __interrupt__?: Array<{ value: InterruptValue }>;
}

function isInterrupted(result: unknown): result is AgentResult {
  return (
    typeof result === "object" &&
    result !== null &&
    "__interrupt__" in result &&
    Array.isArray((result as AgentResult).__interrupt__)
  );
}

function buildAgentInput(text: string, referencedMessages: string[]): string {
  if (referencedMessages.length === 0) {
    return text;
  }
  return `${text}\n\n--- Referenced Slack Content ---\n${referencedMessages.join("\n\n---\n\n")}`;
}

async function fetchReferencedContent(
  client: WebClient,
  text: string,
): Promise<string[]> {
  return fetchReferencedSlackMessages(client, text, env.SLACK_BOT_TOKEN);
}

export function registerAgentMessage(app: App) {
  app.event("app_mention", async ({ event, say, client, logger }) => {
    try {
      const text = event.text.replace(/<@[A-Z0-9]+>/g, "").trim();

      if (!text || shouldIgnoreMessage(text)) {
        return;
      }

      const threadId = event.thread_ts ?? event.ts;

      if (isExitCommand(text)) {
        await clearThread(threadId);
        await say({
          thread_ts: event.ts,
          blocks: (
            <Blocks>
              <Section>
                :wave: Session ended. Conversation history cleared.
              </Section>
            </Blocks>
          ) as unknown as KnownBlock[],
        });
        return;
      }

      const runId = generateRunId();
      const langsmithUrl = getLangSmithUrl(runId);

      await say({
        thread_ts: event.ts,
        blocks: (
          <Blocks>
            <Section>
              :thinking_face: Thinking...
              {langsmithUrl && `\n<${langsmithUrl}|Trace>`}
            </Section>
          </Blocks>
        ) as unknown as KnownBlock[],
      });

      const referencedMessages = await fetchReferencedContent(
        client,
        event.text,
      );
      const agentInput = buildAgentInput(text, referencedMessages);

      const result = await agent.invoke(agentInput, {
        runId,
        configurable: { thread_id: threadId },
        metadata: {
          slack_channel: event.channel,
          slack_user: event.user,
        },
        tags: ["slack-internal"],
      });

      if (isInterrupted(result)) {
        const interruptData = result.__interrupt__![0].value;
        await say({
          thread_ts: event.ts,
          blocks: (
            <Blocks>
              <Section>
                :warning: Tool `{interruptData.toolName}` wants to execute:
                {"\n```\n"}
                {JSON.stringify(interruptData.toolArgs, null, 2)}
                {"\n```"}
              </Section>
              <Actions>
                <Button
                  actionId="agent_approve"
                  value={threadId}
                  style="primary"
                >
                  Approve
                </Button>
                <Button actionId="agent_reject" value={threadId} style="danger">
                  Reject
                </Button>
              </Actions>
            </Blocks>
          ) as unknown as KnownBlock[],
        });
        return;
      }

      await say({
        thread_ts: event.ts,
        blocks: (
          <Blocks>
            <Section>{result || "No response generated."}</Section>
          </Blocks>
        ) as unknown as KnownBlock[],
      });
    } catch (error) {
      logger.error("Agent error:", error);
      await say({
        thread_ts: event.ts,
        text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    }
  });

  app.message(async ({ message, say, client, logger, context }) => {
    try {
      if ("bot_id" in message) return;
      if (!("text" in message) || !message.text) return;

      const text = message.text.trim();
      if (!text) return;
      if (shouldIgnoreMessage(text)) return;

      const isDM = message.channel_type === "im";
      const isThreadReply = "thread_ts" in message && message.thread_ts;

      if (!isDM && !isThreadReply) return;

      if (isThreadReply && !isDM) {
        const parentResult = await client.conversations.history({
          channel: message.channel,
          latest: message.thread_ts as string,
          inclusive: true,
          limit: 1,
        });

        const parentMessage = parentResult.messages?.[0];
        const botUserId = context.botUserId;

        if (!parentMessage?.text?.includes(`<@${botUserId}>`)) {
          return;
        }
      }

      const threadTs =
        "thread_ts" in message ? (message.thread_ts ?? message.ts) : message.ts;

      if (isExitCommand(text)) {
        await clearThread(threadTs);
        await say({
          thread_ts: threadTs,
          blocks: (
            <Blocks>
              <Section>
                :wave: Session ended. Conversation history cleared.
              </Section>
            </Blocks>
          ) as unknown as KnownBlock[],
        });
        return;
      }

      const runId = generateRunId();
      const langsmithUrl = getLangSmithUrl(runId);

      await say({
        thread_ts: threadTs,
        blocks: (
          <Blocks>
            <Section>
              :thinking_face: Thinking...
              {langsmithUrl && `\n<${langsmithUrl}|Trace>`}
            </Section>
          </Blocks>
        ) as unknown as KnownBlock[],
      });

      const referencedMessages = await fetchReferencedContent(
        client,
        message.text,
      );
      const agentInput = buildAgentInput(text, referencedMessages);

      const userId = "user" in message ? message.user : undefined;
      const result = await agent.invoke(agentInput, {
        runId,
        configurable: { thread_id: threadTs },
        metadata: {
          slack_channel: message.channel,
          slack_user: userId,
        },
        tags: ["slack-internal"],
      });

      if (isInterrupted(result)) {
        const interruptData = result.__interrupt__![0].value;
        await say({
          thread_ts: threadTs,
          blocks: (
            <Blocks>
              <Section>
                :warning: Tool `{interruptData.toolName}` wants to execute:
                {"\n```\n"}
                {JSON.stringify(interruptData.toolArgs, null, 2)}
                {"\n```"}
              </Section>
              <Actions>
                <Button
                  actionId="agent_approve"
                  value={threadTs}
                  style="primary"
                >
                  Approve
                </Button>
                <Button actionId="agent_reject" value={threadTs} style="danger">
                  Reject
                </Button>
              </Actions>
            </Blocks>
          ) as unknown as KnownBlock[],
        });
        return;
      }

      await say({
        thread_ts: threadTs,
        blocks: (
          <Blocks>
            <Section>{result || "No response generated."}</Section>
          </Blocks>
        ) as unknown as KnownBlock[],
      });
    } catch (error) {
      logger.error("Agent error:", error);
      const threadTs =
        "thread_ts" in message
          ? (message.thread_ts ?? message.ts)
          : "ts" in message
            ? message.ts
            : undefined;
      await say({
        thread_ts: threadTs,
        text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    }
  });
}
