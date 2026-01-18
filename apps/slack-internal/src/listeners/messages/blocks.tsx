/** @jsxImportSource jsx-slack */
import type { KnownBlock } from "@slack/types";
import { Actions, Blocks, Button, Section } from "jsx-slack";

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
  return [
    { type: "markdown", text: text || "No response generated." },
  ] as unknown as KnownBlock[];
}
