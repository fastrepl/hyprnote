import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@hypr/ui/components/ui/resizable";

import { ChatView } from "../../../components/chat/view";
import { Body } from "../../../components/main/body";
import { LeftSidebar } from "../../../components/main/sidebar";
import { useShell } from "../../../contexts/shell";
import { commands } from "../../../types/tauri.gen";

export const Route = createFileRoute("/app/main/_layout/")({
  component: Component,
});

const SIDEBAR_WIDTH = 280;

function Component() {
  const { leftsidebar, chat } = useShell();
  const previousModeRef = useRef(chat.mode);

  const isChatOpen = chat.mode === "RightPanelOpen";

  useEffect(() => {
    const isOpeningRightPanel =
      chat.mode === "RightPanelOpen" &&
      previousModeRef.current !== "RightPanelOpen";

    if (isOpeningRightPanel) {
      const sidebarWidth = leftsidebar.expanded ? SIDEBAR_WIDTH : 0;
      commands.resizeWindowForChat(sidebarWidth);
    }

    previousModeRef.current = chat.mode;
  }, [chat.mode, leftsidebar.expanded]);

  return (
    <div
      className="flex h-full overflow-hidden gap-1 p-1"
      data-testid="main-app-shell"
    >
      {leftsidebar.expanded && <LeftSidebar />}

      <ResizablePanelGroup
        direction="horizontal"
        className="flex-1 overflow-hidden flex"
        autoSaveId="main-chat"
      >
        <ResizablePanel className="flex-1 overflow-hidden">
          <Body />
        </ResizablePanel>
        {isChatOpen && (
          <>
            <ResizableHandle className="w-0" />
            <ResizablePanel
              defaultSize={30}
              minSize={20}
              maxSize={50}
              className="pl-1"
              style={{ minWidth: CHAT_MIN_WIDTH_PX }}
            >
              <ChatView />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
}
