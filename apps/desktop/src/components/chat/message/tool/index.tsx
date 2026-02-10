import type { Part } from "../types";
import { ToolGeneric } from "./generic";
import { ToolSearchSessions } from "./search";

export function Tool({ part }: { part: Record<string, unknown> }) {
  if (part.type === "tool-search_sessions") {
    return (
      <ToolSearchSessions
        part={part as Extract<Part, { type: "tool-search_sessions" }>}
      />
    );
  }
  return <ToolGeneric part={part} />;
}
