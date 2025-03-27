import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import LeftSidebar from "@/components/left-sidebar";
import { LoginModal } from "@/components/login-modal";
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
  loader: async ({ context: { sessionsStore } }) => {
    const isOnboardingNeeded = await commands.isOnboardingNeeded();
    return { sessionsStore, isOnboardingNeeded };
  },
});

function Component() {
  const { sessionsStore, isOnboardingNeeded } = Route.useLoaderData();
  const windowLabel = getCurrentWebviewWindowLabel();

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(isOnboardingNeeded);

  useEffect(() => {
    registerTemplates();
  }, []);

  return (
    <>
      <HyprProvider>
        <SessionsProvider store={sessionsStore}>
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
                      <LoginModal
                        isOpen={isLoginModalOpen}
                        onClose={() => setIsLoginModalOpen(false)}
                      />
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
