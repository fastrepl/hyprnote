import { createFileRoute, Outlet } from "@tanstack/react-router";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useEffect, useState } from "react";

import LeftSidebar from "@/components/left-sidebar";
import { LoginModal } from "@/components/login-modal";
import RightPanel from "@/components/right-panel";
import Notifications from "@/components/toast";
import Toolbar from "@/components/toolbar";
import {
  EditModeProvider,
  HyprProvider,
  LeftSidebarProvider,
  NewNoteProvider,
  RightPanelProvider,
  SearchProvider,
  SettingsProvider,
  useLeftSidebar,
  useRightPanel,
} from "@/contexts";
import { registerTemplates } from "@/templates";
import { commands } from "@/types";
import { events as windowsEvents, getCurrentWebviewWindowLabel } from "@hypr/plugin-windows";
import { OngoingSessionProvider, SessionsProvider } from "@hypr/utils/contexts";

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
                <MainWindowStateEventSupport />
                <SettingsProvider>
                  <NewNoteProvider>
                    <SearchProvider>
                      <EditModeProvider>
                        <div className="relative flex h-screen w-screen overflow-hidden">
                          <LeftSidebar />
                          <div className="flex-1 flex h-screen w-screen flex-col overflow-hidden">
                            <Toolbar />
                            <div className="flex-1 relative overflow-hidden flex">
                              <div className="flex-1 overflow-hidden">
                                <Outlet />
                              </div>
                              <RightPanel />
                            </div>
                          </div>
                        </div>
                        <LoginModal
                          isOpen={isLoginModalOpen}
                          onClose={() => setIsLoginModalOpen(false)}
                        />
                      </EditModeProvider>
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

function MainWindowStateEventSupport() {
  const { setIsExpanded: setLeftSidebarExpanded } = useLeftSidebar();
  const { setIsExpanded: setRightPanelExpanded } = useRightPanel();

  useEffect(() => {
    const currentWindow = getCurrentWebviewWindow();
    windowsEvents.mainWindowState(currentWindow).listen(({ payload }) => {
      if (payload.left_sidebar_expanded !== null) {
        setLeftSidebarExpanded(payload.left_sidebar_expanded);
      }

      if (payload.right_panel_expanded !== null) {
        setRightPanelExpanded(payload.right_panel_expanded);
      }
    });
  }, []);

  return null;
}
