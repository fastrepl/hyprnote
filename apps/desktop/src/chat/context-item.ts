import type { AccountInfo } from "@hypr/plugin-auth";
import type { DeviceInfo } from "@hypr/plugin-misc";
import type { ChatContext } from "@hypr/plugin-template";

import type { HyprUIMessage } from "./types";
import { isRecord } from "./utils";

export type ContextEntity =
  | {
      kind: "session";
      key: string;
      chatContext: ChatContext;
      wordCount?: number;
      participantCount?: number;
      eventTitle?: string;
      removable?: boolean;
    }
  | ({ kind: "account"; key: string } & Partial<AccountInfo>)
  | ({
      kind: "device";
      key: string;
    } & Partial<DeviceInfo>);

export type ContextEntityKind = ContextEntity["kind"];

type ToolOutputAvailablePart = {
  type: string;
  state: "output-available";
  output?: unknown;
};

function isToolOutputAvailablePart(
  value: unknown,
): value is ToolOutputAvailablePart {
  return (
    isRecord(value) &&
    typeof value.type === "string" &&
    value.state === "output-available"
  );
}

function parseSearchSessionsOutput(output: unknown): ContextEntity[] {
  if (!isRecord(output) || !Array.isArray(output.results)) {
    return [];
  }

  return output.results.flatMap((item): ContextEntity[] => {
    if (!isRecord(item)) {
      return [];
    }

    if (typeof item.id !== "string" && typeof item.id !== "number") {
      return [];
    }

    const title = typeof item.title === "string" ? item.title : null;
    const content = typeof item.content === "string" ? item.content : null;

    return [
      {
        kind: "session",
        key: `session:search:${item.id}`,
        chatContext: {
          title,
          date: null,
          rawContent: content,
          enhancedContent: null,
          transcript: null,
          participants: [],
          event: null,
        },
        removable: true,
      },
    ];
  });
}

const toolEntityExtractors: Record<
  string,
  (output: unknown) => ContextEntity[]
> = {
  search_sessions: parseSearchSessionsOutput,
};

export function extractToolContextEntities(
  messages: Array<Pick<HyprUIMessage, "parts">>,
): ContextEntity[] {
  const seen = new Set<string>();
  const entities: ContextEntity[] = [];

  for (const message of messages) {
    if (!Array.isArray(message.parts)) continue;
    for (const part of message.parts) {
      if (!isToolOutputAvailablePart(part) || !part.type.startsWith("tool-")) {
        continue;
      }

      const toolName = part.type.slice(5);
      const extractor = toolEntityExtractors[toolName];
      if (!extractor) continue;

      for (const entity of extractor(part.output)) {
        if (!seen.has(entity.key)) {
          seen.add(entity.key);
          entities.push(entity);
        }
      }
    }
  }

  return entities;
}
