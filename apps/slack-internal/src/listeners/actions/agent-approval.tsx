/** @jsxImportSource jsx-slack */
import { Command } from "@langchain/langgraph";
import * as Sentry from "@sentry/bun";
import type { App } from "@slack/bolt";
import type { KnownBlock } from "@slack/types";
import { Blocks, Section } from "jsx-slack";

import type { AgentStateType, HumanResponse } from "@hypr/agent-internal";

import { getAgentForChannel } from "../../config/agents";

export function registerAgentApprovalAction(app: App) {
  app.action(
    "agent_approve",
    async ({ action, ack, respond, body, client, logger }) => {
      await ack();

      if (action.type !== "button" || !action.value) {
        return;
      }

      const threadId = action.value;
      const channel = body.channel?.id;

      if (!channel) {
        logger.error("No channel found in action body");
        return;
      }

      await respond({
        replace_original: true,
        blocks: (
          <Blocks>
            <Section>:white_check_mark: Approved. Executing...</Section>
          </Blocks>
        ) as unknown as KnownBlock[],
      });

      try {
        const { agent } = getAgentForChannel(channel);
        const resumeValue: HumanResponse = { type: "accept", args: null };
        const result = (await agent.invoke(
          new Command({ resume: resumeValue }),
          { configurable: { thread_id: threadId } },
        )) as AgentStateType;

        await client.chat.postMessage({
          channel,
          thread_ts: threadId,
          blocks: (
            <Blocks>
              <Section>{result?.output || "Execution completed."}</Section>
            </Blocks>
          ) as unknown as KnownBlock[],
        });
      } catch (error) {
        logger.error("Agent approval error:", error);
        Sentry.withScope((scope) => {
          scope.setTag("slack_channel", channel);
          scope.setTag("slack_thread_id", threadId);
          scope.setTag("action_type", "agent_approve");
          scope.setContext("agent_approval", { channel, threadId });
          Sentry.captureException(error);
        });
        await client.chat.postMessage({
          channel,
          thread_ts: threadId,
          text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    },
  );

  app.action(
    "agent_reject",
    async ({ action, ack, respond, body, client, logger }) => {
      await ack();

      if (action.type !== "button" || !action.value) {
        return;
      }

      const threadId = action.value;
      const channel = body.channel?.id;

      if (!channel) {
        logger.error("No channel found in action body");
        return;
      }

      await respond({
        replace_original: true,
        blocks: (
          <Blocks>
            <Section>:x: Rejected by user.</Section>
          </Blocks>
        ) as unknown as KnownBlock[],
      });

      try {
        const { agent } = getAgentForChannel(channel);
        const resumeValue: HumanResponse = { type: "ignore", args: null };
        const result = (await agent.invoke(
          new Command({ resume: resumeValue }),
          { configurable: { thread_id: threadId } },
        )) as AgentStateType;

        await client.chat.postMessage({
          channel,
          thread_ts: threadId,
          blocks: (
            <Blocks>
              <Section>{result?.output || "Action was rejected."}</Section>
            </Blocks>
          ) as unknown as KnownBlock[],
        });
      } catch (error) {
        logger.error("Agent rejection error:", error);
        Sentry.withScope((scope) => {
          scope.setTag("slack_channel", channel);
          scope.setTag("slack_thread_id", threadId);
          scope.setTag("action_type", "agent_reject");
          scope.setContext("agent_rejection", { channel, threadId });
          Sentry.captureException(error);
        });
        await client.chat.postMessage({
          channel,
          thread_ts: threadId,
          text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    },
  );
}
