import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@hypr/ui/components/ui/resizable";
import { createFileRoute } from "@tanstack/react-router";

import { ChatView } from "../../../components/chat/view";
import { Body } from "../../../components/main/body";
import { LeftSidebar } from "../../../components/main/sidebar";
import { useShell } from "../../../contexts/shell";

export const Route = createFileRoute("/app/main/_layout/")({
  component: Component,
});

function Component() {
  const { leftsidebar, chat } = useShell();

  const isChatOpen = chat.mode === "RightPanelOpen";

  return (
    <div className="flex h-full overflow-hidden gap-1 p-1">
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
            <ResizablePanel defaultSize={30} minSize={20} maxSize={50} className="pl-1">
              <ChatView />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
}
