import { events as notifyEvents } from "@hypr/plugin-notify";

export function safeParseJson(
  value: unknown,
): Record<string, unknown> | undefined {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return undefined;
    }
  }
  if (typeof value === "object" && value !== null) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

export function isFileNotFoundError(error: unknown): boolean {
  const errorStr = String(error);
  return (
    errorStr.includes("No such file or directory") ||
    errorStr.includes("ENOENT") ||
    errorStr.includes("not found")
  );
}

type NotifyListenerHandle = {
  unlisten: (() => void) | null;
  interval: ReturnType<typeof setInterval> | null;
};

const FALLBACK_POLL_INTERVAL = 60000;

export function createNotifyListener(
  pathMatcher: (path: string) => boolean,
  fallbackIntervalMs = FALLBACK_POLL_INTERVAL,
): {
  addListener: (listener: () => void) => NotifyListenerHandle;
  delListener: (handle: NotifyListenerHandle) => void;
} {
  return {
    addListener: (listener: () => void) => {
      const handle: NotifyListenerHandle = { unlisten: null, interval: null };

      (async () => {
        const unlisten = await notifyEvents.fileChanged.listen((event) => {
          if (pathMatcher(event.payload.path)) {
            listener();
          }
        });
        handle.unlisten = unlisten;
      })().catch((error) => {
        console.error("[NotifyListener] Failed to setup:", error);
      });

      handle.interval = setInterval(listener, fallbackIntervalMs);
      return handle;
    },
    delListener: (handle: NotifyListenerHandle) => {
      handle.unlisten?.();
      if (handle.interval) clearInterval(handle.interval);
    },
  };
}
