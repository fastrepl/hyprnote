import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Outlet } from "@tanstack/react-router";

import { RightPanelProvider } from "@/contexts/right-panel";
import { HyprProvider } from "@/contexts/hypr";
import { OngoingSessionProvider } from "@/contexts/ongoing-session";
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
