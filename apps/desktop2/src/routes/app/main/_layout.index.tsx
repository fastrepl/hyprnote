import { createFileRoute } from "@tanstack/react-router";

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@hypr/ui/components/ui/resizable";
import { useLeftSidebar } from "@hypr/utils/contexts";
import { FloatingChatButton } from "../../../components/floating-chat-button";
import { Body } from "../../../components/main/body";
import { LeftSidebar } from "../../../components/main/sidebar";

export const Route = createFileRoute("/app/main/_layout/")({
  component: Component,
});

function Component() {
  const { isExpanded: isLeftPanelExpanded } = useLeftSidebar();

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      {isLeftPanelExpanded && (
        <>
          <ResizablePanel defaultSize={30} minSize={25} maxSize={40}>
            <LeftSidebar />
          </ResizablePanel>
          <ResizableHandle withHandle />
        </>
      )}
      <ResizablePanel>
        <Body />
      </ResizablePanel>
      <FloatingChatButton />
    </ResizablePanelGroup>
  );
}
