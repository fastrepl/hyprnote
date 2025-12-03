import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";

import { TooltipProvider } from "@hypr/ui/components/ui/tooltip";

import { ErrorComponent, NotFoundComponent } from "../../components/control";
import { useConfigSideEffects } from "../../config/use-config";
import { ListenerProvider } from "../../contexts/listener";
import { isExtHostPath } from "../../utils/ext-host";

export const Route = createFileRoute("/app")({
  component: Component,
  errorComponent: ErrorComponent,
  notFoundComponent: NotFoundComponent,
  loader: async ({ context: { listenerStore } }) => {
    return { listenerStore: listenerStore! };
  },
});

function Component() {
  const { listenerStore } = Route.useLoaderData();
  const location = useLocation();
  const isExtHost = isExtHostPath(location.pathname);

  if (isExtHost) {
    return (
      <TooltipProvider>
        <Outlet />
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <ListenerProvider store={listenerStore}>
        <Outlet />
        <SideEffects />
      </ListenerProvider>
    </TooltipProvider>
  );
}

function SideEffects() {
  useConfigSideEffects();

  return null;
}
