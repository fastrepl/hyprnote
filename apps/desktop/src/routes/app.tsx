import { createFileRoute, Outlet, useRouter } from "@tanstack/react-router";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useEffect } from "react";

import LeftSidebar from "@/components/left-sidebar";
import RightPanel from "@/components/right-panel";
import Notifications from "@/components/toast";
import Toolbar from "@/components/toolbar";
import { WelcomeModal } from "@/components/welcome-modal";
import {
  EditModeProvider,
  LeftSidebarProvider,
  NewNoteProvider,
  RightPanelProvider,
  SearchProvider,
  SettingsProvider,
  useLeftSidebar,
  useRightPanel,
} from "@/contexts";
import { commands } from "@/types";
import { commands as listenerCommands } from "@hypr/plugin-listener";
import { events as windowsEvents, getCurrentWebviewWindowLabel } from "@hypr/plugin-windows";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@hypr/ui/components/ui/resizable";
import { OngoingSessionProvider, SessionsProvider } from "@hypr/utils/contexts";

export const Route = createFileRoute("/app")({
  component: Component,
  loader: async ({ context: { sessionsStore, ongoingSessionStore } }) => {
    const isOnboardingNeeded = await commands.isOnboardingNeeded();
    return { sessionsStore, ongoingSessionStore, isOnboardingNeeded };
  },
});

function Component() {
  const router = useRouter();
  const { sessionsStore, ongoingSessionStore, isOnboardingNeeded } = Route.useLoaderData();

  const windowLabel = getCurrentWebviewWindowLabel();
  const showNotifications = windowLabel === "main" && !isOnboardingNeeded;

  return (
    <>
      <SessionsProvider store={sessionsStore}>
        <OngoingSessionProvider store={ongoingSessionStore}>
          <LeftSidebarProvider>
            <RightPanelProvider>
              <AudioPermissions />
              <MainWindowStateEventSupport />
              <SettingsProvider>
                <NewNoteProvider>
                  <SearchProvider>
                    <EditModeProvider>
                      <div className="flex h-screen w-screen overflow-hidden">
                        <LeftSidebar />
                        <div className="flex-1 flex h-screen w-screen flex-col overflow-hidden">
                          <Toolbar />

                          <ResizablePanelGroup
                            direction="horizontal"
                            className="flex-1 overflow-hidden flex"
                            autoSaveId="main"
                          >
                            <ResizablePanel className="flex-1 overflow-hidden">
                              <Outlet />
                            </ResizablePanel>
                            <ResizableHandle className="w-0" />
                            <RightPanel />
                          </ResizablePanelGroup>
                        </div>
                      </div>
                      <WelcomeModal
                        isOpen={isOnboardingNeeded}
                        onClose={() => {
                          commands.setOnboardingNeeded(false);
                          router.invalidate();
                        }}
                      />
                    </EditModeProvider>
                  </SearchProvider>
                </NewNoteProvider>
              </SettingsProvider>
            </RightPanelProvider>
          </LeftSidebarProvider>
        </OngoingSessionProvider>
      </SessionsProvider>
      {showNotifications && <Notifications />}
    </>
  );
}

function AudioPermissions() {
  useEffect(() => {
    listenerCommands.checkMicrophoneAccess().then((isGranted) => {
      if (!isGranted) {
        listenerCommands.requestMicrophoneAccess();
      }
    });

    listenerCommands.checkSystemAudioAccess().then((isGranted) => {
      if (!isGranted) {
        listenerCommands.requestSystemAudioAccess();
      }
    });
  }, []);

  return null;
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
