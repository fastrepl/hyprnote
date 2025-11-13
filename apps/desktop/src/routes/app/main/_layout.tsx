import {
  createFileRoute,
  Outlet,
  useRouteContext,
} from "@tanstack/react-router";
import { useCallback, useEffect, useRef } from "react";

import { buildChatTools } from "../../../chat/tools";
import { AITaskProvider } from "../../../contexts/ai-task";
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
  const { registerOnEmpty, openNew, tabs } = useTabs();
  const hasOpenedInitialTab = useRef(false);

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
