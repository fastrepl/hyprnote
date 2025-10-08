import { OngoingSessionProvider2 } from "@hypr/utils/contexts";
import { createFileRoute, Outlet } from "@tanstack/react-router";

import { useCloudPersister } from "../tinybase/cloudPersister";

export const Route = createFileRoute("/app")({
  component: Component,
  loader: async ({ context: { ongoingSessionStore } }) => {
    return { ongoingSessionStore: ongoingSessionStore! };
  },
});

function Component() {
  const sync = useCloudPersister();
  const { ongoingSessionStore } = Route.useLoaderData();

  return (
    <OngoingSessionProvider2 store={ongoingSessionStore}>
      <button className="absolute top-2 right-12" onClick={() => sync()}>Sync</button>
      <Outlet />
    </OngoingSessionProvider2>
  );
}
