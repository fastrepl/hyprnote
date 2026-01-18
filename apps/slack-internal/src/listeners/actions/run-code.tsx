/** @jsxImportSource jsx-slack */
import type { App } from "@slack/bolt";
import type { KnownBlock } from "@slack/types";
import { Blocks, Section } from "jsx-slack";

import { executeCode } from "../../modal/execute";

export function registerRunCodeAction(app: App) {
  app.action("run_code", async ({ action, ack, respond, logger }) => {
    await ack();

    if (action.type !== "button" || !action.value) {
      return;
    }

    const code = Buffer.from(action.value, "base64").toString("utf-8");

    await respond({
      replace_original: true,
      blocks: (
        <Blocks>
          <Section>:hourglass_flowing_sand: Executing code...</Section>
        </Blocks>
      ) as unknown as KnownBlock[],
    });

    try {
      const result = await executeCode(code);

      const statusEmoji = result.success ? ":white_check_mark:" : ":x:";
      const statusText = result.success ? "completed" : "failed";

      const resultBlocks = [
        <Section>
          {statusEmoji} <b>Execution {statusText}</b> ({result.executionTimeMs}
          ms)
        </Section>,
      ];

      if (result.stdout) {
        resultBlocks.push(
          <Section>
            <b>Output:</b>
            {"\n```"}
            {result.stdout.slice(0, 2900)}
            {"```"}
          </Section>,
        );
      }

      if (result.stderr) {
        resultBlocks.push(
          <Section>
            <b>Errors:</b>
            {"\n```"}
            {result.stderr.slice(0, 2900)}
            {"```"}
          </Section>,
        );
      }

      await respond({
        replace_original: true,
        blocks: (<Blocks>{resultBlocks}</Blocks>) as unknown as KnownBlock[],
      });
    } catch (error) {
      logger.error("Execution error:", error);
      await respond({
        replace_original: true,
        text: `Failed to execute code: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    }
  });

  app.action("cancel_run", async ({ ack, respond }) => {
    await ack();
    await respond({
      delete_original: true,
    });
  });
}
