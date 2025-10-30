import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";

import { commands as detectCommands } from "@hypr/plugin-detect";
import { ListenerProvider } from "../contexts/listener";
import * as main from "../store/tinybase/main";

export const Route = createFileRoute("/app")({
  component: Component,
  loader: async ({ context: { listenerStore } }) => {
    return { listenerStore: listenerStore! };
  },
});

function Component() {
  const { listenerStore } = Route.useLoaderData();

  useQuitHandler();

  return (
    <ListenerProvider store={listenerStore}>
      <Outlet />
    </ListenerProvider>
  );
}

function useQuitHandler() {
  const notification_detect = main.UI.useValue("notification_detect", main.STORE_ID);
  const notification_event = main.UI.useValue("notification_event", main.STORE_ID);

  const active = useMemo(() => notification_detect || notification_event, [notification_detect, notification_event]);

  useEffect(() => {
    if (active) {
      detectCommands.setQuitHandler();
    } else {
      detectCommands.resetQuitHandler();
    }
  }, [active]);
}
