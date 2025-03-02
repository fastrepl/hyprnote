import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Outlet } from "@tanstack/react-router";

import { RightPanelProvider } from "@/contexts/right-panel";
import { HyprProvider } from "@/contexts/hypr";
import { OngoingSessionProvider } from "@/contexts/ongoing-session";
import { LeftSidebarProvider } from "@/contexts/left-sidebar";
import RightPanel from "@/components/right-panel";
import LeftSidebar from "@/components/left-sidebar";
import { registerTemplates } from "@/templates";

import Toolbar from "@/components/toolbar";

export const Route = createFileRoute("/app")({
  component: Component,
});

function Component() {
  useEffect(() => {
    registerTemplates();
    initExtensions();
  }, []);

  return (
    <HyprProvider>
      <OngoingSessionProvider>
        <LeftSidebarProvider>
          <RightPanelProvider>
            <div className="flex h-screen w-screen flex-col overflow-hidden">
              <Toolbar />
              <div className="flex h-full overflow-hidden bg-white">
                <LeftSidebar />
                <div className="flex-1">
                  <Outlet />
                </div>
                <RightPanel />
              </div>
            </div>
          </RightPanelProvider>
        </LeftSidebarProvider>
      </OngoingSessionProvider>
    </HyprProvider>
  );
}

import SummaryExtension from "@hypr/extension-summary";
import TranscriptExtension from "@hypr/extension-transcript";
import DinoGameExtension from "@hypr/extension-dino-game";

function initExtensions() {
  [
    ...Object.values(SummaryExtension),
    ...Object.values(TranscriptExtension),
    ...Object.values(DinoGameExtension),
  ].forEach((group) => {
    group.items.forEach((item) => {
      item.init();
    });
  });
}
