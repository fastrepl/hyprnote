import { createFileRoute } from "@tanstack/react-router";

import { ChatView } from "../../../components/chat/view";
import { Body } from "../../../components/main/body";
import { LeftSidebar } from "../../../components/main/sidebar";
import { useShell } from "../../../contexts/shell";

export const Route = createFileRoute("/app/main/_layout/")({
  component: Component,
});

function Component() {
  const { isLeftSidebarExpanded, chatMode, sendChatEvent } = useShell();

  return (
    <div className="flex h-full overflow-hidden">
      {isLeftSidebarExpanded && <LeftSidebar />}
      <Body />
      {chatMode === "RightPanelOpen" && (
        <ChatView
          setChatGroupId={() => {}}
          onClose={() => sendChatEvent({ type: "CLOSE" })}
        />
      )}
    </div>
  );
}
