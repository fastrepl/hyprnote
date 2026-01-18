/** @jsxImportSource jsx-slack */
import type { App } from "@slack/bolt";
import type { KnownBlock } from "@slack/types";
import { Blocks, Section } from "jsx-slack";

import { executeCode } from "../../modal/execute";

export function registerExecuteCommand(app: App) {
  app.command("/execute", async ({ command, ack, respond, logger }) => {
    await ack();

    const code = command.text.trim();

    if (!code) {
      await respond({
        response_type: "ephemeral",
        text: "Please provide code to execute. Usage: `/execute console.log('Hello!')`",
      });
      return;
    }

    await respond({
      response_type: "in_channel",
      blocks: (
        <Blocks>
          <Section>:hourglass_flowing_sand: Executing code...</Section>
          <Section>
            {"```"}
            {code}
            {"```"}
          </Section>
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
        <Section>
          <b>Code:</b>
          {"\n```"}
          {code}
          {"```"}
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
        response_type: "in_channel",
        replace_original: true,
        blocks: (<Blocks>{resultBlocks}</Blocks>) as unknown as KnownBlock[],
      });
    } catch (error) {
      logger.error("Execution error:", error);
      await respond({
        response_type: "ephemeral",
        text: `Failed to execute code: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    }
  });
}
