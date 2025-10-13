import { useCallback, useMemo, useState } from "react";
import { createActor, fromTransition } from "xstate";

export type ChatMode = "RightPanelOpen" | "FloatingClosed" | "FloatingOpen";
export type ChatEvent = { type: "OPEN" } | { type: "CLOSE" } | { type: "SHIFT" };

const chatModeLogic = fromTransition(
  (state: ChatMode, event: ChatEvent): ChatMode => {
    switch (state) {
      case "RightPanelOpen":
        if (event.type === "CLOSE") {
          return "FloatingClosed";
        }
        if (event.type === "SHIFT") {
          return "FloatingOpen";
        }
        return state;
      case "FloatingClosed":
        if (event.type === "OPEN") {
          return "FloatingOpen";
        }
        return state;
      case "FloatingOpen":
        if (event.type === "CLOSE") {
          return "FloatingClosed";
        }
        if (event.type === "SHIFT") {
          return "RightPanelOpen";
        }
        return state;
      default:
        return state;
    }
  },
  "RightPanelOpen" as ChatMode,
);

export function useChatMode() {
  const [mode, setMode] = useState<ChatMode>("RightPanelOpen");
  const [groupId, setGroupId] = useState<string | undefined>(undefined);

  const actorRef = useMemo(() => {
    const actor = createActor(chatModeLogic);
    actor.subscribe((snapshot) => setMode(snapshot.context));
    actor.start();
    return actor;
  }, []);

  const sendEvent = useCallback(
    (event: ChatEvent) => {
      actorRef.send(event);
    },
    [actorRef],
  );

  return {
    mode,
    sendEvent,
    groupId,
    setGroupId,
  };
}
