import {
  commands as notifyCommands,
  events as notifyEvents,
} from "@hypr/plugin-notify";

interface Loadable {
  load(): Promise<unknown>;
}

const DEBOUNCE_MS = 500;
const RECONCILE_INTERVAL_MS = 30000;

let isInternalChange = false;

export function markInternalChange() {
  isInternalChange = true;
}

export async function startSessionWatcher(
  persister: Loadable,
): Promise<() => void> {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const result = await notifyCommands.start();
  if (result.status === "error") {
    console.error("[SessionWatcher] Failed to start:", result.error);
    return () => {};
  }

  const reloadDebounced = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(async () => {
      if (isInternalChange) {
        isInternalChange = false;
        return;
      }

      console.log("[SessionWatcher] External change detected, reloading...");
      try {
        await persister.load();
      } catch (error) {
        console.error("[SessionWatcher] Failed to reload:", error);
      }
    }, DEBOUNCE_MS);
  };

  const unlisten = await notifyEvents.fileChanged.listen((event) => {
    const path = event.payload.path;
    if (path.startsWith("sessions/")) {
      reloadDebounced();
    }
  });

  const reconcileInterval = setInterval(async () => {
    try {
      await persister.load();
    } catch (error) {
      console.error("[SessionWatcher] Reconciliation failed:", error);
    }
  }, RECONCILE_INTERVAL_MS);

  return () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    clearInterval(reconcileInterval);
    unlisten();
    void notifyCommands.stop();
  };
}
