import { createFileRoute, Outlet, useRouteContext } from "@tanstack/react-router";
import { useCallback, useEffect } from "react";

import { toolFactories } from "../../../chat/tools";
import { useSearchEngine } from "../../../contexts/search/engine";
import { SearchEngineProvider } from "../../../contexts/search/engine";
import { SearchUIProvider, useSearch } from "../../../contexts/search/ui";
import { ShellProvider } from "../../../contexts/shell";
import { useToolRegistry } from "../../../contexts/tool";
import { ToolRegistryProvider } from "../../../contexts/tool";
import { useTabs } from "../../../store/zustand/tabs";
import { id } from "../../../utils";

export const Route = createFileRoute("/app/main/_layout")({
  component: Component,
});

function Component() {
  const { persistedStore, internalStore } = useRouteContext({ from: "__root__" });
  const { registerOnClose, registerOnEmpty, currentTab, openNew, close } = useTabs();

  useEffect(() => {
    return registerOnClose((tab) => {
      if (tab.type === "sessions" && persistedStore) {
        const row = persistedStore.getRow("sessions", tab.id);
        if (!row) {
          return;
        }

        if (!row.title && !row.raw_md && !row.enhanced_md) {
          persistedStore.delRow("sessions", tab.id);
        }
      }
    });
  }, [persistedStore, registerOnClose]);

  useEffect(() => {
    const createDefaultSession = () => {
      const user_id = internalStore?.getValue("user_id");
      const sessionId = id();
      persistedStore?.setRow("sessions", sessionId, { user_id, created_at: new Date().toISOString() });
      openNew({ id: sessionId, type: "sessions", active: true, state: { editor: "raw" } });
    };

    if (!currentTab) {
      createDefaultSession();
    }

    return registerOnEmpty(createDefaultSession);
  }, [currentTab, persistedStore, internalStore, registerOnEmpty, openNew]);

  const handleNewTab = useCallback((closeCurrentFirst: boolean) => {
    const user_id = internalStore?.getValue("user_id");
    const sessionId = id();
    persistedStore?.setRow("sessions", sessionId, {
      user_id,
      created_at: new Date().toISOString(),
      title: "",
    });

    if (closeCurrentFirst && currentTab) {
      close(currentTab);
    }

    openNew({
      type: "sessions",
      id: sessionId,
      active: true,
      state: { editor: "raw" },
    });
  }, [persistedStore, internalStore, currentTab, close, openNew]);

  return (
    <SearchEngineProvider store={persistedStore}>
      <SearchUIProvider>
        <SearchShortcutBridge onNewTab={handleNewTab} />
      </SearchUIProvider>
    </SearchEngineProvider>
  );
}

function SearchShortcutBridge({ onNewTab }: { onNewTab: (closeCurrentFirst: boolean) => void }) {
  const { focusInput } = useSearch();

  return (
    <ShellProvider onNewTab={onNewTab} onFocusSearch={focusInput}>
      <ToolRegistryProvider>
        <ToolRegistration />
        <Outlet />
      </ToolRegistryProvider>
    </ShellProvider>
  );
}

function ToolRegistration() {
  const registry = useToolRegistry();
  const { search } = useSearchEngine();

  useEffect(() => {
    const deps = { search };

    Object.entries(toolFactories).forEach(([key, factory]) => {
      registry.register(key, factory(deps));
    });
  }, [registry, search]);

  return null;
}
