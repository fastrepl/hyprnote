import { createFileRoute, Outlet } from "@tanstack/react-router";

import { useConfigSideEffects } from "../config/use-config";
import { ListenerProvider } from "../contexts/listener";

export const Route = createFileRoute("/app")({
  component: Component,
  loader: async ({ context: { listenerStore } }) => {
    return { listenerStore: listenerStore! };
  },
});

function Component() {
  const { listenerStore } = Route.useLoaderData();

  return (
    <ListenerProvider store={listenerStore}>
      <Outlet />
      <SideEffects />
    </ListenerProvider>
  );
}

function SideEffects() {
  useConfigSideEffects();

  return null;
}
