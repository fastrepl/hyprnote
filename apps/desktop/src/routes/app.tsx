import { createFileRoute, Outlet } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { useEffect } from "react";
import { z } from "zod";

import LeftSidebar from "@/components/left-sidebar";
import Toolbar from "@/components/toolbar";
import {
  HyprProvider,
  LeftSidebarProvider,
  NewNoteProvider,
  OngoingSessionProvider,
  RightPanelProvider,
  SearchProvider,
  SessionsProvider,
  SettingsPanelProvider,
} from "@/contexts";
import { registerTemplates } from "@/templates";
import DinoGameExtension from "@hypr/extension-dino-game";
import SummaryExtension from "@hypr/extension-summary";
import TranscriptExtension from "@hypr/extension-transcript";

const schema = z.object({
  window: z.enum(["main", "sub"]).default("main"),
});

export const Route = createFileRoute("/app")({
  validateSearch: zodValidator(schema),
  component: Component,
  loader: async ({ context: { sessionsStore } }) => {
    return sessionsStore;
  },
});

function Component() {
  const store = Route.useLoaderData();

  useEffect(() => {
    registerTemplates();
    initExtensions();
  }, []);

  return (
    <HyprProvider>
      <SessionsProvider store={store}>
        <OngoingSessionProvider>
          <LeftSidebarProvider>
            <RightPanelProvider>
              <SettingsPanelProvider>
                <NewNoteProvider>
                  <SearchProvider>
                    <div className="relative flex h-screen w-screen overflow-hidden">
                      <LeftSidebar />
                      <div className="flex-1 flex h-screen w-screen flex-col overflow-hidden">
                        <Toolbar />
                        <Outlet />
                      </div>
                    </div>
                  </SearchProvider>
                </NewNoteProvider>
              </SettingsPanelProvider>
            </RightPanelProvider>
          </LeftSidebarProvider>
        </OngoingSessionProvider>
      </SessionsProvider>
    </HyprProvider>
  );
}

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
