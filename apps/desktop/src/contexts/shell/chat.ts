import { useCallback, useEffect, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { type ActorRefFrom, createActor, fromTransition } from "xstate";

export type ChatMode = "RightPanelOpen" | "FloatingClosed" | "FloatingOpen";
export type ChatEvent =
  | { type: "OPEN" }
  | { type: "CLOSE" }
  | { type: "SHIFT" }
  | { type: "TOGGLE" };

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
  const [draftMessage, setDraftMessage] = useState<any>(undefined);

  const actorRef = useRef<ActorRefFrom<typeof chatModeLogic> | null>(null);

  useEffect(() => {
    const actor = createActor(chatModeLogic);
    actorRef.current = actor;
    const subscription = actor.subscribe((snapshot) =>
      setMode(snapshot.context),
    );
    actor.start();
    return () => {
      subscription.unsubscribe();
      actor.stop();
    };
  }, []);

  const sendEvent = useCallback((event: ChatEvent) => {
    actorRef.current?.send(event);
  }, []);

  useHotkeys(
    "mod+j",
    () => sendEvent({ type: "TOGGLE" }),
    {
      preventDefault: true,
      enableOnFormTags: true,
      enableOnContentEditable: true,
    },
    [sendEvent],
  );

  return {
    mode,
    sendEvent,
    groupId,
    setGroupId,
    draftMessage,
    setDraftMessage,
  };
}
