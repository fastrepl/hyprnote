import { commands as localLlmCommands } from "@hypr/plugin-local-llm";
import { commands as localSttCommands } from "@hypr/plugin-local-stt";
import { sonnerToast } from "@hypr/ui/components/ui/toast";
import { createFileRoute, Outlet, useRouter } from "@tanstack/react-router";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { watch } from "@tauri-apps/plugin-fs";
import { useEffect, useState } from "react";

import { IndividualizationModal } from "@/components/individualization-modal";
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
    const isIndividualizationNeeded = await commands.isIndividualizationNeeded();
    return { sessionsStore, ongoingSessionStore, isOnboardingNeeded, isIndividualizationNeeded };
  },
});

function Component() {
  const router = useRouter();
  const { sessionsStore, ongoingSessionStore, isOnboardingNeeded, isIndividualizationNeeded } = Route.useLoaderData();

  const [onboardingCompletedThisSession, setOnboardingCompletedThisSession] = useState(false);

  const windowLabel = getCurrentWebviewWindowLabel();
  const isMain = windowLabel === "main";
  const showNotifications = isMain && !isOnboardingNeeded;

  const shouldShowWelcomeModal = isMain && isOnboardingNeeded;
  const shouldShowIndividualization = isMain && isIndividualizationNeeded && !isOnboardingNeeded
    && !onboardingCompletedThisSession;

  return (
    <>
      <SessionsProvider store={sessionsStore}>
        <OngoingSessionProvider store={ongoingSessionStore}>
          <LeftSidebarProvider>
            <RightPanelProvider>
              <AudioPermissions />
              <RestartTTT />
              <RestartSTT />
              <MainWindowStateEventSupport />
              <MeetingAutomationEventListeners />
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
                          commands.setOnboardingNeeded(false);
                          setOnboardingCompletedThisSession(true);
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
          </LeftSidebarProvider>
        </OngoingSessionProvider>
      </SessionsProvider>
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
      localSttCommands.restartServer();
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

// Helper functions for runtime validation
function isRecordingPayload(payload: unknown): payload is { app_name: string; session_id: string; timestamp: string } {
  return (
    typeof payload === "object"
    && payload !== null
    && typeof (payload as any).app_name === "string"
    && typeof (payload as any).session_id === "string"
    && typeof (payload as any).timestamp === "string"
  );
}

function isNotificationPayload(payload: unknown): payload is { title: string; message: string; timestamp: string } {
  return (
    typeof payload === "object"
    && payload !== null
    && typeof (payload as any).title === "string"
    && typeof (payload as any).message === "string"
    && typeof (payload as any).timestamp === "string"
  );
}

function MeetingAutomationEventListeners() {
  useEffect(() => {
    const unsubscribePromises = [
      listen("recording_auto_started", (event) => {
        if (!isRecordingPayload(event.payload)) {
          console.error("Invalid recording_auto_started payload:", event.payload);
          return;
        }
        const data = event.payload;
        sonnerToast.success("Recording started automatically", {
          description: `Started recording for ${data.app_name}`,
          duration: 3000,
        });
      }),

      listen("recording_auto_stopped", (event) => {
        sonnerToast.info("Recording stopped automatically", {
          description: "Meeting automation stopped the recording",
          duration: 3000,
        });
      }),

      listen("meeting_notification", (event) => {
        if (!isNotificationPayload(event.payload)) {
          console.error("Invalid meeting_notification payload:", event.payload);
          return;
        }
        const data = event.payload;
        sonnerToast.info(data.title, {
          description: data.message,
          duration: 5000,
        });
      }),
    ];

    return () => {
      Promise.all(unsubscribePromises).then(unsubscribeFns => {
        unsubscribeFns.forEach(fn => fn());
      });
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
