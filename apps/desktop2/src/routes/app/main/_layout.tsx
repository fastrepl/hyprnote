import { LeftSidebarProvider, RightPanelProvider } from "@hypr/utils/contexts";
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/app/main/_layout")({
  component: Component,
});

function Component() {
  return (
    <LeftSidebarProvider>
      <RightPanelProvider>
        <Outlet />
      </RightPanelProvider>
    </LeftSidebarProvider>
  );
}
