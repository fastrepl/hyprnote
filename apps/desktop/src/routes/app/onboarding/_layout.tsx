import { createFileRoute, Outlet } from "@tanstack/react-router";

import { useDeeplinkHandler } from "../../../hooks/useDeeplinkHandler";

export const Route = createFileRoute("/app/onboarding/_layout")({
  component: Component,
});

function Component() {
  useDeeplinkHandler();

  return <Outlet />;
}
