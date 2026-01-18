/** @jsxImportSource jsx-slack */
import type { App } from "@slack/bolt";
import type { KnownBlock } from "@slack/types";
import { Actions, Blocks, Button, Section } from "jsx-slack";

const CODE_BLOCK_REGEX = /```(?:typescript|ts|javascript|js)?\n?([\s\S]*?)```/;

export function registerCodeBlockMessage(app: App) {
  app.message(CODE_BLOCK_REGEX, async ({ message, say, logger }) => {
    try {
      if ("bot_id" in message) return;
      if (!("text" in message) || !message.text) return;

      const match = message.text.match(CODE_BLOCK_REGEX);
      if (!match || !match[1]) return;

      const code = match[1].trim();
      if (!code) return;

      await say({
        thread_ts: message.ts,
        blocks: (
          <Blocks>
            <Section>
              I detected a code block. Would you like me to execute it?
            </Section>
            <Actions>
              <Button
                actionId="run_code"
                style="primary"
                value={Buffer.from(code).toString("base64")}
              >
                Run Code
              </Button>
              <Button actionId="cancel_run">Cancel</Button>
            </Actions>
          </Blocks>
        ) as unknown as KnownBlock[],
      });
    } catch (error) {
      logger.error("Error handling code block message:", error);
    }
  });
}
