import { LeftSidebarProvider, RightPanelProvider } from "@hypr/utils/contexts";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Header } from "../components/header";

export const Route = createFileRoute("/app/_layout/main")({
  component: Component,
});

function Component() {
  return (
    <LeftSidebarProvider>
      <RightPanelProvider>
        <Header />
        <Outlet />
      </RightPanelProvider>
    </LeftSidebarProvider>
  );
}
