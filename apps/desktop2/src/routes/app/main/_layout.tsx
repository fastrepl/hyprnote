import { createFileRoute, Outlet, useRouteContext } from "@tanstack/react-router";
import { useEffect } from "react";

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
  const { persistedStore } = useRouteContext({ from: "__root__" });
  const { registerOnClose } = useTabs();

  useEffect(() => {
    return registerOnClose((tab) => {
      console.log(tab);
    });
  }, [registerOnClose]);

  return (
    <ShellProvider>
      <SearchEngineProvider store={persistedStore}>
        <SearchUIProvider>
          <ToolRegistryProvider>
            <ToolRegistration />
            <Outlet />
            <NotSureAboutThis />
          </ToolRegistryProvider>
        </SearchUIProvider>
      </SearchEngineProvider>
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

// TOOD
function NotSureAboutThis() {
  const { persistedStore, internalStore } = useRouteContext({ from: "__root__" });
  const { currentTab, openNew } = useTabs();

  useEffect(() => {
    if (!currentTab) {
      const user_id = internalStore?.getValue("user_id");
      const sessionId = id();
      persistedStore?.setRow("sessions", sessionId, { user_id, created_at: new Date().toISOString() });
      openNew({ id: sessionId, type: "sessions", active: true, state: { editor: "raw" } });
    }
  }, [currentTab]);

  return null;
}
