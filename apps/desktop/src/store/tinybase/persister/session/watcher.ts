import { commands as notifyCommands } from "@hypr/plugin-notify";

import { createNotifyListener } from "../shared/fs";

interface Loadable {
  load(): Promise<unknown>;
}

const RECONCILE_INTERVAL_MS = 30000;

const sessionNotifyListener = createNotifyListener(
  (path) => path.startsWith("sessions/"),
  RECONCILE_INTERVAL_MS,
);

export async function startSessionWatcher(
  persister: Loadable,
): Promise<() => void> {
  const result = await notifyCommands.start();
  if (result.status === "error") {
    console.error("[SessionWatcher] Failed to start:", result.error);
    return () => {};
  }

  const handle = sessionNotifyListener.addListener(async () => {
    try {
      await persister.load();
    } catch (error) {
      console.error("[SessionWatcher] Failed to reload:", error);
    }
  });

  return () => {
    sessionNotifyListener.delListener(handle);
    void notifyCommands.stop();
  };
}
