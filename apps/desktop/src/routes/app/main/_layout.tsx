import {
  createFileRoute,
  Outlet,
  useRouteContext,
} from "@tanstack/react-router";
import { useCallback, useEffect, useRef } from "react";

import { buildChatTools } from "../../../chat/tools";
import { AITaskProvider } from "../../../contexts/ai-task";
import { NotificationProvider } from "../../../contexts/notifications";
import { useSearchEngine } from "../../../contexts/search/engine";
import { SearchEngineProvider } from "../../../contexts/search/engine";
import { SearchUIProvider } from "../../../contexts/search/ui";
import { ShellProvider } from "../../../contexts/shell";
import { useRegisterTools } from "../../../contexts/tool";
import { ToolRegistryProvider } from "../../../contexts/tool";
import { useDeeplinkHandler } from "../../../hooks/useDeeplinkHandler";
import { deleteSessionCascade } from "../../../store/tinybase/store/deleteSession";
import * as main from "../../../store/tinybase/store/main";
import { isSessionEmpty } from "../../../store/tinybase/store/sessions";
import {
  restorePinnedTabsToStore,
  restoreRecentlyOpenedToStore,
  useTabs,
} from "../../../store/zustand/tabs";

export const Route = createFileRoute("/app/main/_layout")({
  component: Component,
});

function Component() {
  const { persistedStore, aiTaskStore, toolRegistry } = useRouteContext({
    from: "__root__",
  });
  const {
    registerOnEmpty,
    registerCanClose,
    registerOnClose,
    openNew,
    pin,
    invalidateResource,
  } = useTabs();
  const hasOpenedInitialTab = useRef(false);
  const store = main.UI.useStore(main.STORE_ID);
  const indexes = main.UI.useIndexes(main.STORE_ID);

  useDeeplinkHandler();

  const openDefaultEmptyTab = useCallback(() => {
    openNew({ type: "empty" });
  }, [openNew]);

  useEffect(() => {
    const initializeTabs = async () => {
      if (!hasOpenedInitialTab.current) {
        hasOpenedInitialTab.current = true;
        await restorePinnedTabsToStore(
          openNew,
          pin,
          () => useTabs.getState().tabs,
        );
        await restoreRecentlyOpenedToStore((ids) => {
          useTabs.setState({ recentlyOpenedSessionIds: ids });
        });
        const currentTabs = useTabs.getState().tabs;
        if (currentTabs.length === 0) {
          openDefaultEmptyTab();
        }
      }
    };

    initializeTabs();
    registerOnEmpty(openDefaultEmptyTab);
  }, [openNew, pin, openDefaultEmptyTab, registerOnEmpty]);

  useEffect(() => {
    registerCanClose(() => true);
  }, [registerCanClose]);

  useEffect(() => {
    if (!store) {
      return;
    }
    registerOnClose((tab) => {
      if (tab.type === "sessions") {
        const sessionId = tab.id;
        if (isSessionEmpty(store, sessionId)) {
          invalidateResource("sessions", sessionId);
          void deleteSessionCascade(store, indexes, sessionId);
        }
      }
    });
  }, [registerOnClose, invalidateResource, store, indexes]);

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

  useRegisterTools("chat-general", () => buildChatTools({ search }), [search]);

  return null;
}
