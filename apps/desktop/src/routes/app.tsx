import { createFileRoute } from "@tanstack/react-router";
import { Outlet } from "@tanstack/react-router";

import Toolbar from "@/components/toolbar";
import { RightPanelProvider } from "@/contexts/right-panel";
import { HyprProvider } from "@/contexts/hypr";

export const Route = createFileRoute("/app")({
  component: Component,
});

function Component() {
  console.log("app");
  return (
    <HyprProvider>
      <RightPanelProvider>
        <div className="flex h-screen w-screen flex-col overflow-x-hidden">
          <Toolbar />
          <Outlet />
        </div>
      </RightPanelProvider>
    </HyprProvider>
  );
}
