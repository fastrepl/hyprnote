import type { SessionContext } from "@hypr/plugin-template";

import type { ContextEntity } from "../context-item";

export type ChatSystemContext = {
  context: SessionContext | null;
};

// Tool-derived entities (e.g. search_sessions results) are already visible to
// the model through message history.  Excluding them from the system prompt
// avoids duplicate/competing context and keeps the prompt focused.
export function filterForPrompt(entities: ContextEntity[]): ContextEntity[] {
  return entities.filter((e) => e.source !== "tool");
}

export function buildChatSystemContext(
  entities: ContextEntity[],
): ChatSystemContext {
  const primary = entities.find(
    (e): e is Extract<ContextEntity, { kind: "session" }> =>
      e.kind === "session" && e.key === "session:info",
  );

  return {
    context: primary?.sessionContext ?? null,
  };
}
