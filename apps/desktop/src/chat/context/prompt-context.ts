import type { SessionContext } from "@hypr/plugin-template";

import type { ContextEntity } from "../context-item";

type SessionEntity = Extract<ContextEntity, { kind: "session" }>;

export type ChatSystemContext = {
  context: SessionContext | null;
  relatedSessions: SessionContext[];
};

function toSessionContext(entity: SessionEntity): SessionContext {
  const { sessionContext } = entity;
  return {
    title: sessionContext.title,
    date: sessionContext.date,
    rawContent: sessionContext.rawContent,
    enhancedContent: sessionContext.enhancedContent,
    transcript: sessionContext.transcript,
    participants: sessionContext.participants,
    event: sessionContext.event,
  };
}

export function buildChatSystemContext(
  entities: ContextEntity[],
): ChatSystemContext {
  const sessions = entities.filter(
    (e): e is SessionEntity => e.kind === "session",
  );

  const primaryIdx = sessions.findIndex((s) => s.key === "session:info");
  const primary = primaryIdx !== -1 ? sessions[primaryIdx] : null;

  const relatedSessions = sessions
    .filter((_, i) => i !== primaryIdx)
    .map(toSessionContext);

  return {
    context: primary ? toSessionContext(primary) : null,
    relatedSessions,
  };
}
