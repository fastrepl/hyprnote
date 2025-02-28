import { createFileRoute } from "@tanstack/react-router";
import { Outlet } from "@tanstack/react-router";

import Toolbar from "@/components/toolbar";
import { RightPanelProvider } from "@/contexts/right-panel";
import { HyprProvider } from "@/contexts/hypr";
import { OngoingSessionProvider } from "@/contexts/ongoing-session";

export const Route = createFileRoute("/app")({
  component: Component,
});

function Component() {
  return (
    <HyprProvider>
      <OngoingSessionProvider>
        <RightPanelProvider>
          <div className="flex h-screen w-screen flex-col overflow-x-hidden">
            <Toolbar />
            <Outlet />
          </div>
        </RightPanelProvider>
      </OngoingSessionProvider>
    </HyprProvider>
  );
}
