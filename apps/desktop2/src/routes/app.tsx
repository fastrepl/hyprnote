import { createFileRoute, Outlet } from "@tanstack/react-router";

import { getCurrentWebviewWindowLabel } from "@hypr/plugin-windows";
import { LeftSidebarProvider, OngoingSessionProvider2, RightPanelProvider } from "@hypr/utils/contexts";

export const Route = createFileRoute("/app")({
  component: Component,
  loader: async ({ context: { ongoingSessionStore } }) => {
    return { ongoingSessionStore: ongoingSessionStore! };
  },
});

function Component() {
  const { ongoingSessionStore } = Route.useLoaderData();

  const windowLabel = getCurrentWebviewWindowLabel();
  const isMain = windowLabel === "main";

  return (
    <OngoingSessionProvider2 store={ongoingSessionStore}>
      <LeftSidebarProvider>
        {isMain
          ? (
            <RightPanelProvider>
              <Outlet />
            </RightPanelProvider>
          )
          : <Outlet />}
      </LeftSidebarProvider>
    </OngoingSessionProvider2>
  );
}
