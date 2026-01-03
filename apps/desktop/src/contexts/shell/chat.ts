import { LogicalSize } from "@tauri-apps/api/dpi";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { createActor, fromTransition } from "xstate";

const appWindow = getCurrentWebviewWindow();

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
  const [previousMode, setPreviousMode] = useState<ChatMode>("FloatingClosed");

  const actorRef = useMemo(() => createActor(chatModeLogic), []);

  useEffect(() => {
    actorRef.subscribe((snapshot) => setMode(snapshot.context));
    actorRef.start();
  }, [actorRef]);

  useEffect(() => {
    const handleWindowResize = async () => {
      const isOpeningRightPanel =
        mode === "RightPanelOpen" && previousMode !== "RightPanelOpen";
      const isClosingRightPanel =
        mode !== "RightPanelOpen" && previousMode === "RightPanelOpen";

      if (isOpeningRightPanel) {
        const currentSize = await appWindow.innerSize();
        const currentWidth = currentSize.width;

        if (currentWidth < 600) {
          await appWindow.setSize(
            new LogicalSize(currentWidth + 400, currentSize.height),
          );
        }
      } else if (isClosingRightPanel) {
        const currentSize = await appWindow.innerSize();
        await appWindow.setSize(
          new LogicalSize(currentSize.width - 400, currentSize.height),
        );
      }

      setPreviousMode(mode);
    };

    handleWindowResize();
  }, [mode, previousMode]);

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
  };
}
