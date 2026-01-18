/** @jsxImportSource jsx-slack */
import type { App } from "@slack/bolt";
import type { KnownBlock } from "@slack/types";
import { Blocks, Section } from "jsx-slack";

import { runAgent } from "../../agent";

export function registerAgentMessage(app: App) {
  app.event("app_mention", async ({ event, say, logger }) => {
    try {
      const text = event.text.replace(/<@[A-Z0-9]+>/g, "").trim();

      if (!text) {
        await say({
          thread_ts: event.ts,
          blocks: (
            <Blocks>
              <Section>Please provide a message for me to respond to.</Section>
            </Blocks>
          ) as unknown as KnownBlock[],
        });
        return;
      }

      await say({
        thread_ts: event.ts,
        blocks: (
          <Blocks>
            <Section>:thinking_face: Thinking...</Section>
          </Blocks>
        ) as unknown as KnownBlock[],
      });

      const result = await runAgent(text);

      const responseBlocks = [
        <Section>{result.text || "No response generated."}</Section>,
      ];

      if (result.steps.length > 0) {
        const toolCalls = result.steps.flatMap(
          (s: { toolCalls: Array<{ toolName: string }> }) => s.toolCalls,
        );
        if (toolCalls.length > 0) {
          const toolSummary = toolCalls
            .map((tc: { toolName: string }) => `\`${tc.toolName}\``)
            .join(", ");
          responseBlocks.push(
            <Section>
              <i>Tools used: {toolSummary}</i>
            </Section>,
          );
        }
      }

      await say({
        thread_ts: event.ts,
        blocks: (<Blocks>{responseBlocks}</Blocks>) as unknown as KnownBlock[],
      });
    } catch (error) {
      logger.error("Agent error:", error);
      await say({
        thread_ts: event.ts,
        text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    }
  });

  app.message(async ({ message, say, logger }) => {
    try {
      if ("bot_id" in message) return;
      if (message.channel_type !== "im") return;
      if (!("text" in message) || !message.text) return;

      const text = message.text.trim();
      if (!text) return;

      await say({
        thread_ts: message.ts,
        blocks: (
          <Blocks>
            <Section>:thinking_face: Thinking...</Section>
          </Blocks>
        ) as unknown as KnownBlock[],
      });

      const result = await runAgent(text);

      const responseBlocks = [
        <Section>{result.text || "No response generated."}</Section>,
      ];

      if (result.steps.length > 0) {
        const toolCalls = result.steps.flatMap(
          (s: { toolCalls: Array<{ toolName: string }> }) => s.toolCalls,
        );
        if (toolCalls.length > 0) {
          const toolSummary = toolCalls
            .map((tc: { toolName: string }) => `\`${tc.toolName}\``)
            .join(", ");
          responseBlocks.push(
            <Section>
              <i>Tools used: {toolSummary}</i>
            </Section>,
          );
        }
      }

      await say({
        thread_ts: message.ts,
        blocks: (<Blocks>{responseBlocks}</Blocks>) as unknown as KnownBlock[],
      });
    } catch (error) {
      logger.error("Agent error:", error);
      await say({
        thread_ts: "ts" in message ? message.ts : undefined,
        text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    }
  });
}
