import { createFileRoute } from "@tanstack/react-router";

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@hypr/ui/components/ui/resizable";
import { useLeftSidebar } from "@hypr/utils/contexts";
import { FloatingChatButton } from "../../../components/floating-chat-button";
import { MainContent } from "../../../components/main/body";
import { LeftSidebar } from "../../../components/main/left-sidebar";

export const Route = createFileRoute("/app/main/_layout/")({
  component: Component,
});

function Component() {
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
        <MainContent />
      </ResizablePanel>
      <FloatingChatButton />
    </ResizablePanelGroup>
  );
}
