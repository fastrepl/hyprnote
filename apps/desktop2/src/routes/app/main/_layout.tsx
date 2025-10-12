import { createFileRoute, Outlet, useRouteContext } from "@tanstack/react-router";
import { useEffect } from "react";

import { LeftSidebarProvider, RightPanelProvider } from "@hypr/utils/contexts";
import { SearchProvider } from "../../../contexts/search";
import { useTabs } from "../../../store/zustand/tabs";
import { id } from "../../../utils";

export const Route = createFileRoute("/app/main/_layout")({
  component: Component,
});

function Component() {
  return (
    <LeftSidebarProvider>
      <RightPanelProvider>
        <SearchProvider>
          <NotSureAboutThis />
          <Outlet />
        </SearchProvider>
      </RightPanelProvider>
    </LeftSidebarProvider>
  );
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
