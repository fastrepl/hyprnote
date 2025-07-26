import { useMatch } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import type { ActiveEntityInfo, Message } from "../types/chat-types";

interface UseActiveEntityProps {
  setMessages: (messages: Message[]) => void;
  setInputValue: (value: string) => void;
  setShowHistory: (show: boolean) => void;
  setHasChatStarted: (started: boolean) => void;
  setIsGenerating?: (generating: boolean) => void;
}

export function useActiveEntity({
  setMessages,
  setInputValue,
  setShowHistory,
  setHasChatStarted,
  setIsGenerating,
}: UseActiveEntityProps) {
  const [activeEntity, setActiveEntity] = useState<ActiveEntityInfo | null>(null);

  const noteMatch = useMatch({ from: "/app/note/$id", shouldThrow: false });
  const humanMatch = useMatch({ from: "/app/human/$id", shouldThrow: false });
  const organizationMatch = useMatch({ from: "/app/organization/$id", shouldThrow: false });

  const sessionId = activeEntity?.type === "note" ? activeEntity.id : null;

  useEffect(() => {
    let newEntity = null;

    if (noteMatch) {
      const noteId = noteMatch.params.id;
      newEntity = {
        id: noteId,
        type: "note" as const,
      };
    } else if (humanMatch) {
      const humanId = humanMatch.params.id;
      newEntity = {
        id: humanId,
        type: "human" as const,
      };
    } else if (organizationMatch) {
      const orgId = organizationMatch.params.id;
      newEntity = {
        id: orgId,
        type: "organization" as const,
      };
    }

    const isDifferentSession = !activeEntity
      || (newEntity && (activeEntity.id !== newEntity.id || activeEntity.type !== newEntity.type));

    if (isDifferentSession) {
      setActiveEntity(newEntity);
      setMessages([]);
      setInputValue("");
      setShowHistory(false);
      setHasChatStarted(false);
      setIsGenerating?.(false);
    }
  }, [
    noteMatch,
    humanMatch,
    organizationMatch,
    activeEntity,
    setMessages,
    setInputValue,
    setShowHistory,
    setHasChatStarted,
    setIsGenerating,
  ]);

  return {
    activeEntity,
    sessionId,
    setActiveEntity,
  };
}
