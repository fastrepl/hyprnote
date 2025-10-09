import { createFileRoute } from "@tanstack/react-router";

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@hypr/ui/components/ui/resizable";
import { useLeftSidebar } from "@hypr/utils/contexts";
import { FloatingChatButton } from "../../../components/floating-chat-button";
import { LeftSidebar } from "../../../components/main/left-sidebar";
import { MainContent, MainHeader } from "../../../components/main/main-area";

export const Route = createFileRoute("/app/main/_layout/")({
  component: Component,
});

function Component() {
  const { isExpanded: isRightPanelExpanded } = useRightPanel();
  const { isExpanded: isLeftPanelExpanded } = useLeftSidebar();

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      {isLeftPanelExpanded && (
        <>
          <ResizablePanel defaultSize={20} minSize={15} maxSize={40}>
            <LeftSidebar />
          </ResizablePanel>
          <ResizableHandle withHandle />
        </>
      )}
      <ResizablePanel>
        <div className="flex flex-col h-full">
          <MainHeader />
          {isRightPanelExpanded
            ? (
              <ResizablePanelGroup direction="horizontal">
                <ResizablePanel defaultSize={60} minSize={30}>
                  <MainContent />
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={40} minSize={30}>
                  <Chat />
                </ResizablePanel>
              </ResizablePanelGroup>
            )
            : <MainContent />}
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
