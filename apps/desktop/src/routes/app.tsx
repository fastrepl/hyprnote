import { commands as localLlmCommands } from "@hypr/plugin-local-llm";
import { commands as localSttCommands } from "@hypr/plugin-local-stt";
import { createFileRoute, Outlet, useLocation, useRouter } from "@tanstack/react-router";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { watch } from "@tauri-apps/plugin-fs";
import { useEffect, useState } from "react";

import { IndividualizationModal } from "@/components/individualization-modal";
import LeftSidebar from "@/components/left-sidebar";
import { LicenseRefreshProvider } from "@/components/license";
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
  useHypr,
  useLeftSidebar,
  useRightPanel,
} from "@/contexts";
import { commands } from "@/types";
import { commands as analyticsCommands } from "@hypr/plugin-analytics";
import { events as windowsEvents, getCurrentWebviewWindowLabel } from "@hypr/plugin-windows";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@hypr/ui/components/ui/resizable";
import { OngoingSessionProvider, SessionsProvider } from "@hypr/utils/contexts";

export const Route = createFileRoute("/app")({
  component: Component,
  loader: async ({ context: { sessionsStore, ongoingSessionStore } }) => {
    const isOnboardingNeeded = await commands.isOnboardingNeeded();
    const isIndividualizationNeeded = await commands.isIndividualizationNeeded();
    return { sessionsStore, ongoingSessionStore, isOnboardingNeeded, isIndividualizationNeeded };
  },
});

function Component() {
  const router = useRouter();
  const location = useLocation();
  const { thankYouSessionId, userId } = useHypr();
  const { sessionsStore, ongoingSessionStore, isOnboardingNeeded, isIndividualizationNeeded } = Route.useLoaderData();

  const [onboardingCompletedThisSession, setOnboardingCompletedThisSession] = useState(false);

  const windowLabel = getCurrentWebviewWindowLabel();
  const isMain = windowLabel === "main";
  const showNotifications = isMain && !isOnboardingNeeded;

  const shouldShowWelcomeModal = isMain && isOnboardingNeeded;
  const shouldShowIndividualization = isMain && isIndividualizationNeeded && !isOnboardingNeeded
    && !onboardingCompletedThisSession;

  // Check if we're in the finder route
  const isFinderRoute = location.pathname.includes("/finder");

  const content = (
    <SessionsProvider store={sessionsStore}>
      <OngoingSessionProvider store={ongoingSessionStore}>
        <LeftSidebarProvider>
          {isMain
            ? (
              <RightPanelProvider>
                <RestartTTT />
                <RestartSTT />
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
                          isOpen={shouldShowWelcomeModal}
                          onClose={() => {
                            setOnboardingCompletedThisSession(true);
                            analyticsCommands.event({
                              event: "onboarding_all_steps_completed",
                              distinct_id: userId,
                            });
                            if (thankYouSessionId) {
                              router.navigate({ to: `/app/note/${thankYouSessionId}` });
                            }
                            router.invalidate();
                          }}
                        />
                        <IndividualizationModal
                          isOpen={shouldShowIndividualization}
                          onClose={() => {
                            commands.setIndividualizationNeeded(false);
                            router.invalidate();
                          }}
                        />
                      </EditModeProvider>
                    </SearchProvider>
                  </NewNoteProvider>
                </SettingsProvider>
              </RightPanelProvider>
            )
            : (
              <div className="h-screen w-screen overflow-hidden">
                <Outlet />
              </div>
            )}
        </LeftSidebarProvider>
      </OngoingSessionProvider>
    </SessionsProvider>
  );

  return (
    <>
      {isFinderRoute ? content : (
        <LicenseRefreshProvider>
          {content}
        </LicenseRefreshProvider>
      )}
      {showNotifications && <Notifications />}
    </>
  );
}

function RestartTTT() {
  const watcher = async () => {
    const llmPath = await localLlmCommands.modelsDir();

    return watch(llmPath, (_event) => {
      localLlmCommands.restartServer();
    }, { delayMs: 1000 });
  };

  useEffect(() => {
    let unwatch: () => void;

    watcher().then((f) => {
      unwatch = f;
    });

    return () => {
      unwatch?.();
    };
  }, []);

  return null;
}

function RestartSTT() {
  const watcher = async () => {
    const sttPath = await localSttCommands.modelsDir();

    return watch(sttPath, (_event) => {
      localSttCommands.stopServer(null).then((stopped) => {
        if (stopped) {
          localSttCommands.getCurrentModel().then((model) => {
            localSttCommands.startServer(model);
          });
        }
      });
    }, { delayMs: 1000 });
  };

  useEffect(() => {
    let unwatch: () => void;

    watcher().then((f) => {
      unwatch = f;
    });

    return () => {
      unwatch?.();
    };
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
