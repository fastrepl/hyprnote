import type { ToolPartType } from "../../../../chat/tools";
import type { Part } from "../types";

import { ToolSearchSessions } from "./search";

export function Tool({ part }: { part: Extract<Part, { type: ToolPartType }> }) {
  if (part.type === "tool-search_sessions") {
    return <ToolSearchSessions part={part} />;
  }
  return <pre>{JSON.stringify(part)}</pre>;
}
