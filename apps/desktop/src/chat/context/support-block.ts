import { commands as authCommands } from "@hypr/plugin-auth";

import type { ContextEntity } from "../context-item";
import { collectDeviceEntity } from "./device-info";
import { renderPromptBlock } from "./registry";

async function collectAccountEntity(): Promise<Extract<
  ContextEntity,
  { kind: "account" }
> | null> {
  try {
    const result = await authCommands.getAccountInfo();
    if (result.status === "ok" && result.data) {
      return {
        kind: "account",
        key: "support:account",
        ...result.data,
      };
    }
  } catch (error) {
    console.error("Failed to collect account info:", error);
  }
  return null;
}

export async function collectSupportContextBlock(): Promise<{
  entities: ContextEntity[];
  block: string | null;
}> {
  const entities: ContextEntity[] = [];

  const accountEntity = await collectAccountEntity();
  if (accountEntity) {
    entities.push(accountEntity);
  }

  const deviceEntity = await collectDeviceEntity();
  entities.push(deviceEntity);

  const blockLines = entities
    .map(renderPromptBlock)
    .filter((line): line is string => line !== null);

  if (blockLines.length === 0) {
    return { entities, block: null };
  }

  return {
    entities,
    block:
      "---\nThe following is automatically collected context about the current user and their environment. Use it when filing issues or diagnosing problems.\n\n" +
      blockLines.join("\n"),
  };
}
