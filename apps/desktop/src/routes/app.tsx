import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect } from "react";

import LeftSidebar from "@/components/left-sidebar";
import Notifications from "@/components/toast";
import Toolbar from "@/components/toolbar";
import {
  HyprProvider,
  LeftSidebarProvider,
  NewNoteProvider,
  OngoingSessionProvider,
  RightPanelProvider,
  SearchProvider,
  SessionsProvider,
  SettingsProvider,
} from "@/contexts";
import { registerTemplates } from "@/templates";
import { commands } from "@/types";
import { getCurrentWebviewWindowLabel } from "@hypr/plugin-windows";

export const Route = createFileRoute("/app")({
  component: Component,
  beforeLoad: async () => {
    const isOnboardingNeeded = await commands.isOnboardingNeeded();
    if (isOnboardingNeeded) {
      throw redirect({ to: "/login" });
    }
  },
  loader: async ({ context: { sessionsStore } }) => {
    return sessionsStore;
  },
});

function Component() {
  const store = Route.useLoaderData();

  const windowLabel = getCurrentWebviewWindowLabel();

  useEffect(() => {
    registerTemplates();
  }, []);

  return (
    <>
      <HyprProvider>
        <SessionsProvider store={store}>
          <OngoingSessionProvider>
            <LeftSidebarProvider>
              <RightPanelProvider>
                <SettingsProvider>
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
                </SettingsProvider>
              </RightPanelProvider>
            </LeftSidebarProvider>
          </OngoingSessionProvider>
        </SessionsProvider>
      </HyprProvider>
      {windowLabel === "main" && <Notifications />}
    </>
  );
}
