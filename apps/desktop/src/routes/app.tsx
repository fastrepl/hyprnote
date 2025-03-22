import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";

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

export const Route = createFileRoute("/app")({
  component: Component,
  loader: async ({ context: { sessionsStore } }) => {
    return sessionsStore;
  },
});

function Component() {
  const store = Route.useLoaderData();

  useEffect(() => {
    registerTemplates();
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
