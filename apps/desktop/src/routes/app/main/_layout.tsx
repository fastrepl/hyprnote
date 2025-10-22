import { createFileRoute, Outlet, useRouteContext } from "@tanstack/react-router";
import { useCallback, useEffect } from "react";

import { toolFactories } from "../../../chat/tools";
import { useSearchEngine } from "../../../contexts/search/engine";
import { SearchEngineProvider } from "../../../contexts/search/engine";
import { SearchUIProvider } from "../../../contexts/search/ui";
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
  const { registerOnClose, registerOnEmpty, currentTab, openNew, invalidateResource } = useTabs();

  const createDefaultSession = useCallback(() => {
    const user_id = internalStore?.getValue("user_id");
    const sessionId = id();
    persistedStore?.setRow("sessions", sessionId, { user_id, created_at: new Date().toISOString() });
    openNew({ id: sessionId, type: "sessions", state: { editor: "raw" } });
  }, [persistedStore, internalStore, openNew]);

  useEffect(() => {
    registerOnClose((tab) => {
      if (tab.type === "sessions" && persistedStore) {
        const row = persistedStore.getRow("sessions", tab.id);
        if (!row) {
          return;
        }

        if (!row.title && !row.raw_md && !row.enhanced_md) {
          invalidateResource("sessions", tab.id);
          persistedStore.delRow("sessions", tab.id);
        }
      }
    });
  }, [persistedStore, registerOnClose, invalidateResource]);

  useEffect(() => {
    if (!currentTab) {
      createDefaultSession();
    }
  }, [currentTab, createDefaultSession]);

  useEffect(() => {
    registerOnEmpty(createDefaultSession);
  }, [createDefaultSession, registerOnEmpty]);

  return (
    <SearchEngineProvider store={persistedStore}>
      <SearchUIProvider>
        <ShellProvider>
          <ToolRegistryProvider>
            <ToolRegistration />
            <Outlet />
          </ToolRegistryProvider>
        </ShellProvider>
      </SearchUIProvider>
    </SearchEngineProvider>
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
