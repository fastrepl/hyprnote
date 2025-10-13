import { createFileRoute } from "@tanstack/react-router";

import { useLeftSidebar } from "@hypr/utils/contexts";
import { ChatFloatingButton } from "../../../components/chat";
import { Body } from "../../../components/main/body";
import { LeftSidebar } from "../../../components/main/sidebar";

export const Route = createFileRoute("/app/main/_layout/")({
  component: Component,
});

function Component() {
  const { isExpanded: isLeftPanelExpanded } = useLeftSidebar();

  return (
    <div className="flex h-full overflow-hidden">
      {isLeftPanelExpanded && <LeftSidebar />}
      <Body />
      <ChatFloatingButton />
    </div>
  );
}
