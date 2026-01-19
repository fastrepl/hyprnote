/** @jsxImportSource jsx-slack */
import { Command } from "@langchain/langgraph";
import type { App } from "@slack/bolt";
import type { KnownBlock } from "@slack/types";
import { Blocks, Section } from "jsx-slack";

import { agent } from "@hypr/agent-internal";

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
        const result = await agent.invoke(
          new Command({ resume: { approved: true } }),
          { configurable: { thread_id: threadId } },
        );

        await client.chat.postMessage({
          channel,
          thread_ts: threadId,
          blocks: (
            <Blocks>
              <Section>{(result as string) || "Execution completed."}</Section>
            </Blocks>
          ) as unknown as KnownBlock[],
        });
      } catch (error) {
        logger.error("Agent approval error:", error);
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
        const result = await agent.invoke(
          new Command({
            resume: { approved: false, reason: "Rejected by user" },
          }),
          { configurable: { thread_id: threadId } },
        );

        await client.chat.postMessage({
          channel,
          thread_ts: threadId,
          blocks: (
            <Blocks>
              <Section>{(result as string) || "Action was rejected."}</Section>
            </Blocks>
          ) as unknown as KnownBlock[],
        });
      } catch (error) {
        logger.error("Agent rejection error:", error);
        await client.chat.postMessage({
          channel,
          thread_ts: threadId,
          text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    },
  );
}
