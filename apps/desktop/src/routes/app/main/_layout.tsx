import {
  createFileRoute,
  Outlet,
  useRouteContext,
} from "@tanstack/react-router";
import { usePrevious } from "@uidotdev/usehooks";
import { useCallback, useEffect, useRef } from "react";

import { buildChatTools } from "../../../chat/tools";
import { AITaskProvider } from "../../../contexts/ai-task";
import { useListener } from "../../../contexts/listener";
import { NotificationProvider } from "../../../contexts/notifications";
import { useSearchEngine } from "../../../contexts/search/engine";
import { SearchEngineProvider } from "../../../contexts/search/engine";
import { SearchUIProvider } from "../../../contexts/search/ui";
import { ShellProvider } from "../../../contexts/shell";
import { useRegisterTools } from "../../../contexts/tool";
import { ToolRegistryProvider } from "../../../contexts/tool";
import { useDeeplinkHandler } from "../../../hooks/useDeeplinkHandler";
import { useTabs } from "../../../store/zustand/tabs";

export const Route = createFileRoute("/app/main/_layout")({
  component: Component,
});

function Component() {
  const { persistedStore, aiTaskStore, toolRegistry } = useRouteContext({
    from: "__root__",
  });
  const { registerOnEmpty, registerCanClose, openNew, pin } = useTabs();
  const tabs = useTabs((state) => state.tabs);
  const hasOpenedInitialTab = useRef(false);
  const liveSessionId = useListener((state) => state.live.sessionId);
  const liveStatus = useListener((state) => state.live.status);
  const prevLiveStatus = usePrevious(liveStatus);

  useDeeplinkHandler();

  const openDefaultEmptyTab = useCallback(() => {
    openNew({ type: "empty" });
  }, [openNew]);

  useEffect(() => {
    if (tabs.length === 0 && !hasOpenedInitialTab.current) {
      hasOpenedInitialTab.current = true;
      openDefaultEmptyTab();
    }

    registerOnEmpty(openDefaultEmptyTab);
  }, [tabs.length, openDefaultEmptyTab, registerOnEmpty]);

  useEffect(() => {
    const justStartedListening =
      prevLiveStatus !== "active" && liveStatus === "active";
    if (justStartedListening && liveSessionId) {
      const currentTabs = useTabs.getState().tabs;
      const sessionTab = currentTabs.find(
        (t) => t.type === "sessions" && t.id === liveSessionId,
      );
      if (sessionTab && !sessionTab.pinned) {
        pin(sessionTab);
      }
    }
  }, [liveStatus, prevLiveStatus, liveSessionId, pin]);

  useEffect(() => {
    registerCanClose(() => true);
  }, [registerCanClose]);

  if (!aiTaskStore) {
    return null;
  }

  return (
    <SearchEngineProvider store={persistedStore}>
      <SearchUIProvider>
        <ShellProvider>
          <ToolRegistryProvider registry={toolRegistry}>
            <AITaskProvider store={aiTaskStore}>
              <NotificationProvider>
                <ToolRegistration />
                <Outlet />
              </NotificationProvider>
            </AITaskProvider>
          </ToolRegistryProvider>
        </ShellProvider>
      </SearchUIProvider>
    </SearchEngineProvider>
  );
}

function ToolRegistration() {
  const { search } = useSearchEngine();

  useRegisterTools("chat", () => buildChatTools({ search }), [search]);

  return null;
}
