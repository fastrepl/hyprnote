import { useCallback, useEffect, useMemo, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { createActor, fromTransition } from "xstate";

export type ContextRefType = "session" | "human" | "organization";
export type ContextRefSource = "auto" | "manual";

export type ContextRef = {
  type: ContextRefType;
  id: string;
  source: ContextRefSource;
};

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
  const [refs, setRefs] = useState<ContextRef[]>([]);

  const addRef = useCallback((ref: ContextRef) => {
    setRefs((prev) => {
      if (prev.some((r) => r.type === ref.type && r.id === ref.id)) {
        return prev;
      }
      return [...prev, ref];
    });
  }, []);

  const removeRef = useCallback((id: string) => {
    setRefs((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const clearRefs = useCallback(() => setRefs([]), []);

  const actorRef = useMemo(() => createActor(chatModeLogic), []);

  useEffect(() => {
    actorRef.subscribe((snapshot) => setMode(snapshot.context));
    actorRef.start();
  }, [actorRef]);

  const sendEvent = useCallback(
    (event: ChatEvent) => actorRef.send(event),
    [actorRef],
  );

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
    refs,
    addRef,
    removeRef,
    clearRefs,
  };
}
