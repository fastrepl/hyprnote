import { mkdir, writeTextFile } from "@tauri-apps/plugin-fs";

import { events as notifyEvents } from "@hypr/plugin-notify";

export async function ensureDirsExist(dirs: Set<string>): Promise<void> {
  for (const dir of dirs) {
    try {
      await mkdir(dir, { recursive: true });
    } catch (e) {
      if (!(e instanceof Error && e.message.includes("already exists"))) {
        throw e;
      }
    }
  }
}

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

export async function writeJsonFiles(
  operations: Array<{ path: string; content: unknown }>,
  dirs: Set<string>,
): Promise<void> {
  if (operations.length === 0) return;

  await ensureDirsExist(dirs);
  for (const op of operations) {
    try {
      await writeTextFile(op.path, JSON.stringify(op.content, null, 2));
    } catch (e) {
      console.error(`Failed to write ${op.path}:`, e);
    }
  }
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
