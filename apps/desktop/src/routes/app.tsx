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
import { events as windowsEvents } from "@hypr/plugin-windows";
import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useEffect } from "react";

import DinoGameExtension from "@hypr/extension-dino-game";
import SummaryExtension from "@hypr/extension-summary";
import TranscriptExtension from "@hypr/extension-transcript";

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

export const Route = createFileRoute("/app")({
  component: Component,
  loader: async ({ context: { sessionsStore } }) => {
    return sessionsStore;
  },
});

function Component() {
  const store = Route.useLoaderData();
  const navigate = useNavigate();

  useEffect(() => {
    registerTemplates();
    initExtensions();

    let unlisten: (() => void) | undefined;

    windowsEvents.navigate(getCurrentWebviewWindow()).listen(({ payload }) => {
      navigate({ to: payload.path });
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      unlisten?.();
    };
  }, [navigate]);

  return (
    <HyprProvider>
      <SessionsProvider store={store}>
        <OngoingSessionProvider>
          <LeftSidebarProvider>
            <RightPanelProvider>
              <SettingsPanelProvider>
                <NewNoteProvider>
                  <SearchProvider>
                    <Outlet />
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
