/** @jsxImportSource jsx-slack */
import type { App } from "@slack/bolt";
import type { KnownBlock } from "@slack/types";
import { Blocks, Section } from "jsx-slack";

export function registerHyprnoteCommand(app: App) {
  app.command("/hyprnote", async ({ command, ack, respond }) => {
    await ack();

    const subcommand = command.text.trim().toLowerCase();

    if (subcommand === "help" || !subcommand) {
      await respond({
        response_type: "ephemeral",
        blocks: (
          <Blocks>
            <Section>
              <b>Hyprnote Commands</b>
            </Section>
            <Section>
              {"\u2022"} <code>/hyprnote help</code> - Show this help message
            </Section>
          </Blocks>
        ) as unknown as KnownBlock[],
      });
      return;
    }

    await respond({
      response_type: "ephemeral",
      text: `Unknown command: ${subcommand}. Use \`/hyprnote help\` to see available commands.`,
    });
  });
}
