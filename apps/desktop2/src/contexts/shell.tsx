import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { createActor, fromTransition } from "xstate";

type ChatMode = "RightPanelOpen" | "FloatingClosed" | "FloatingOpen";
type ChatEvent = { type: "OPEN" } | { type: "CLOSE" } | { type: "SHIFT" };

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

const VALID_TRANSITIONS: Record<ChatMode, Set<ChatEvent["type"]>> = {
  RightPanelOpen: new Set(["CLOSE", "SHIFT"]),
  FloatingClosed: new Set(["OPEN"]),
  FloatingOpen: new Set(["CLOSE", "SHIFT"]),
};

interface ShellContextType {
  isLeftSidebarExpanded: boolean;
  setIsLeftSidebarExpanded: (v: boolean) => void;
  toggleLeftSidebar: () => void;
  chatMode: ChatMode;
  sendChatEvent: (event: ChatEvent) => void;
  canHandleChatEvent: (eventType: ChatEvent["type"]) => boolean;
  handleableChatEvents: Record<ChatEvent["type"], boolean>;
}

const ShellContext = createContext<ShellContextType | null>(null);

export function ShellProvider({ children }: { children: React.ReactNode }) {
  const [isLeftSidebarExpanded, setIsLeftSidebarExpanded] = useState(true);
  const [chatMode, setChatMode] = useState<ChatMode>("RightPanelOpen");

  const actorRef = useMemo(() => {
    const actor = createActor(chatModeLogic);
    actor.subscribe((snapshot) => setChatMode(snapshot.context));
    actor.start();
    return actor;
  }, []);

  const toggleLeftSidebar = useCallback(() => {
    setIsLeftSidebarExpanded((prev) => !prev);
  }, []);

  const sendChatEvent = useCallback(
    (event: ChatEvent) => {
      actorRef.send(event);
    },
    [actorRef],
  );

  const canHandleChatEvent = useCallback(
    (eventType: ChatEvent["type"]): boolean => {
      return VALID_TRANSITIONS[chatMode].has(eventType);
    },
    [chatMode],
  );

  const handleableChatEvents = useMemo(
    (): Record<ChatEvent["type"], boolean> => ({
      OPEN: canHandleChatEvent("OPEN"),
      CLOSE: canHandleChatEvent("CLOSE"),
      SHIFT: canHandleChatEvent("SHIFT"),
    }),
    [canHandleChatEvent],
  );

  useHotkeys(
    "mod+l",
    (event) => {
      event.preventDefault();
      toggleLeftSidebar();
    },
    {
      enableOnFormTags: true,
      enableOnContentEditable: true,
    },
  );

  return (
    <ShellContext.Provider
      value={{
        isLeftSidebarExpanded,
        setIsLeftSidebarExpanded,
        toggleLeftSidebar,
        chatMode,
        sendChatEvent,
        canHandleChatEvent,
        handleableChatEvents,
      }}
    >
      {children}
    </ShellContext.Provider>
  );
}

export function useShell() {
  const context = useContext(ShellContext);
  if (!context) {
    throw new Error("useShell must be used within ShellProvider");
  }
  return context;
}

export type { ChatEvent, ChatMode };
