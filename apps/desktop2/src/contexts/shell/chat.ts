import { useCallback, useEffect, useMemo, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { createActor, fromTransition } from "xstate";

export type ChatMode = "RightPanelOpen" | "FloatingClosed" | "FloatingOpen";
export type ChatEvent = { type: "OPEN" } | { type: "CLOSE" } | { type: "SHIFT" } | { type: "TOGGLE" };

const chatModeLogic = fromTransition(
  (state: ChatMode, event: ChatEvent): ChatMode => {
    switch (state) {
      case "RightPanelOpen":
        if (event.type === "CLOSE" || event.type === "TOGGLE") {
          return "FloatingClosed";
        }
        if (event.type === "SHIFT") {
          return "FloatingOpen";
        }
        return state;
      case "FloatingClosed":
        if (event.type === "OPEN" || event.type === "TOGGLE") {
          return "FloatingOpen";
        }
        return state;
      case "FloatingOpen":
        if (event.type === "CLOSE" || event.type === "TOGGLE") {
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
  "FloatingClosed" as ChatMode,
);

export function useChatMode() {
  const [mode, setMode] = useState<ChatMode>("FloatingClosed");
  const [groupId, setGroupId] = useState<string | undefined>(undefined);

  const actorRef = useMemo(() => createActor(chatModeLogic), []);

  useEffect(() => {
    actorRef.subscribe((snapshot) => setMode(snapshot.context));
    actorRef.start();
  }, [actorRef]);

  const sendEvent = useCallback(
    (event: ChatEvent) => actorRef.send(event),
    [actorRef],
  );

  useHotkeys("mod+j", () => sendEvent({ type: "TOGGLE" }));

  return {
    mode,
    sendEvent,
    groupId,
    setGroupId,
  };
}
