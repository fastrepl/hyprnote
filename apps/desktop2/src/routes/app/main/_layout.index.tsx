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
    <div className="flex h-full overflow-hidden">
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
            <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
              <ChatView />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
}
