/** @jsxImportSource jsx-slack */
import type { KnownBlock } from "@slack/types";
import { Actions, Blocks, Button, Section } from "jsx-slack";

import { markdownToBlocks } from "../../utils/markdown-to-blocks";

export function ExitBlock(): KnownBlock[] {
  return (
    <Blocks>
      <Section>:wave: Session ended. Conversation history cleared.</Section>
    </Blocks>
  ) as unknown as KnownBlock[];
}

export function ExitBlockSimple(): KnownBlock[] {
  return (
    <Blocks>
      <Section>:wave:</Section>
    </Blocks>
  ) as unknown as KnownBlock[];
}

export function WelcomeBlock({
  langsmithUrl,
}: {
  langsmithUrl: string | null;
}): KnownBlock[] {
  return (
    <Blocks>
      <Section>Continue conversation in this thread</Section>
      {langsmithUrl ? (
        <Actions>
          <Button url={langsmithUrl} style="primary">
            View Traces
          </Button>
        </Actions>
      ) : null}
      <Section>
        :bulb: Tip: Start your message with <code>!aside</code> to have the
        agent ignore it
      </Section>
    </Blocks>
  ) as unknown as KnownBlock[];
}

export function InterruptBlock({
  toolName,
  toolArgs,
  threadTs,
}: {
  toolName: string;
  toolArgs: Record<string, unknown>;
  threadTs: string;
}): KnownBlock[] {
  return (
    <Blocks>
      <Section>
        :warning: Tool <code>{toolName}</code> wants to execute:
        <pre>{JSON.stringify(toolArgs, null, 2)}</pre>
      </Section>
      <Actions>
        <Button actionId="agent_approve" value={threadTs} style="primary">
          Approve
        </Button>
        <Button actionId="agent_reject" value={threadTs} style="danger">
          Reject
        </Button>
      </Actions>
    </Blocks>
  ) as unknown as KnownBlock[];
}

export function ResponseBlock(text: string): KnownBlock[] {
  return markdownToBlocks(text || "No response generated.");
}

export function TerminateBlock({
  langsmithUrl,
}: {
  langsmithUrl: string | null;
}): KnownBlock[] {
  return (
    <Blocks>
      <Section>:octagonal_sign: Agent terminated.</Section>
      {langsmithUrl ? (
        <Actions>
          <Button url={langsmithUrl} style="danger">
            View Traces
          </Button>
        </Actions>
      ) : null}
    </Blocks>
  ) as unknown as KnownBlock[];
}
