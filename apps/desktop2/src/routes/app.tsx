import { LeftSidebarProvider, OngoingSessionProvider2 } from "@hypr/utils/contexts";
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/app")({
  component: Component,
  loader: async ({ context: { ongoingSessionStore } }) => {
    return { ongoingSessionStore: ongoingSessionStore! };
  },
});

function Component() {
  const { ongoingSessionStore } = Route.useLoaderData();

  return (
    <OngoingSessionProvider2 store={ongoingSessionStore}>
      <LeftSidebarProvider>
        <Outlet />
      </LeftSidebarProvider>
    </OngoingSessionProvider2>
  );
}
