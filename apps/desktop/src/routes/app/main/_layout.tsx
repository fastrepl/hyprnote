import {
  createFileRoute,
  Outlet,
  useRouteContext,
} from "@tanstack/react-router";
import { useCallback, useEffect, useRef } from "react";

import { events as deeplink2Events } from "@hypr/plugin-deeplink2";

import { useAuth } from "../../../auth";
import { buildChatTools } from "../../../chat/tools";
import { AITaskProvider } from "../../../contexts/ai-task";
import { useListener } from "../../../contexts/listener";
import { useSearchEngine } from "../../../contexts/search/engine";
import { SearchEngineProvider } from "../../../contexts/search/engine";
import { SearchUIProvider } from "../../../contexts/search/ui";
import { ShellProvider } from "../../../contexts/shell";
import { useRegisterTools } from "../../../contexts/tool";
import { ToolRegistryProvider } from "../../../contexts/tool";
import { useTabs } from "../../../store/zustand/tabs";

export const Route = createFileRoute("/app/main/_layout")({
  component: Component,
});

function Component() {
  const { persistedStore, aiTaskStore, toolRegistry } = useRouteContext({
    from: "__root__",
  });
  const { registerOnEmpty, registerCanClose, openNew, tabs } = useTabs();
  const hasOpenedInitialTab = useRef(false);
  const getSessionMode = useListener((state) => state.getSessionMode);

  useDeeplinkHandler();

  const openDefaultEmptyTab = useCallback(() => {
    openNew({ type: "empty" });
  }, [openNew]);

  useEffect(() => {
    // Use ref to prevent double-opening in React Strict Mode
    if (tabs.length === 0 && !hasOpenedInitialTab.current) {
      hasOpenedInitialTab.current = true;
      openDefaultEmptyTab();
    }

    registerOnEmpty(openDefaultEmptyTab);
  }, [tabs.length, openDefaultEmptyTab, registerOnEmpty]);

  useEffect(() => {
    registerCanClose((tab) => {
      if (tab.type !== "sessions") {
        return true;
      }
      const mode = getSessionMode(tab.id);
      return mode !== "active" && mode !== "finalizing";
    });
  }, [registerCanClose, getSessionMode]);

  if (!aiTaskStore) {
    return null;
  }

  return (
    <SearchEngineProvider store={persistedStore}>
      <SearchUIProvider>
        <ShellProvider>
          <ToolRegistryProvider registry={toolRegistry}>
            <AITaskProvider store={aiTaskStore}>
              <ToolRegistration />
              <Outlet />
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

function useDeeplinkHandler() {
  const auth = useAuth();

  useEffect(() => {
    const unlisten = deeplink2Events.deepLinkEvent.listen(({ payload }) => {
      if (payload.to !== "/auth/callback") return;

      const { access_token, refresh_token } = payload.search;
      if (access_token && refresh_token && auth) {
        void auth.setSessionFromTokens(access_token, refresh_token);
      }
    });

    return () => {
      void unlisten.then((fn) => fn());
    };
  }, [auth]);
}
