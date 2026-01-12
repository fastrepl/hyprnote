import { events as notifyEvents } from "@hypr/plugin-notify";

export type NotifyListenerHandle = {
  unlisten: (() => void) | null;
  interval: ReturnType<typeof setInterval> | null;
  debounceTimeout?: ReturnType<typeof setTimeout> | null;
};

const FALLBACK_POLL_INTERVAL = 300000;

export type EntityInfo = {
  entityId: string;
  path: string;
};

export type DebouncedBatcher<T> = {
  add: (key: string, item: T) => void;
  flush: () => void;
  clear: () => void;
  getTimeoutHandle: () => ReturnType<typeof setTimeout> | null;
};

export function createDebouncedBatcher<T>(
  onFlush: (items: Map<string, T>) => void,
  debounceMs: number,
): DebouncedBatcher<T> {
  const pending = new Map<string, T>();
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  const flush = () => {
    if (pending.size > 0) {
      const items = new Map(pending);
      pending.clear();
      onFlush(items);
    }
    timeoutHandle = null;
  };

  return {
    add: (key: string, item: T) => {
      pending.set(key, item);
      if (timeoutHandle) clearTimeout(timeoutHandle);
      timeoutHandle = setTimeout(flush, debounceMs);
    },
    flush: () => {
      if (timeoutHandle) clearTimeout(timeoutHandle);
      flush();
    },
    clear: () => {
      if (timeoutHandle) clearTimeout(timeoutHandle);
      timeoutHandle = null;
      pending.clear();
    },
    getTimeoutHandle: () => timeoutHandle,
  };
}

const DEFAULT_DEBOUNCE_MS = 50;

export type FileListenerConfig =
  | {
      mode: "simple";
      pathMatcher: (path: string) => boolean;
      fallbackIntervalMs?: number;
    }
  | {
      mode: "entity";
      pathMatcher: (path: string) => boolean;
      entityParser: (path: string) => string | null;
      debounceMs?: number;
    };

type SimpleListener = () => void;
type EntityListener = (entity: EntityInfo) => void;

type FileListenerResult<TConfig extends FileListenerConfig> = TConfig extends {
  mode: "entity";
}
  ? {
      addListener: (listener: EntityListener) => NotifyListenerHandle;
      delListener: (handle: NotifyListenerHandle) => void;
    }
  : {
      addListener: (listener: SimpleListener) => NotifyListenerHandle;
      delListener: (handle: NotifyListenerHandle) => void;
    };

export function createFileListener<TConfig extends FileListenerConfig>(
  config: TConfig,
): FileListenerResult<TConfig> {
  const delListener = (handle: NotifyListenerHandle) => {
    handle.unlisten?.();
    if (handle.interval) clearInterval(handle.interval);
    if (handle.debounceTimeout) clearTimeout(handle.debounceTimeout);
  };

  if (config.mode === "entity") {
    const {
      pathMatcher,
      entityParser,
      debounceMs = DEFAULT_DEBOUNCE_MS,
    } = config;
    return {
      addListener: (listener: EntityListener) => {
        const handle: NotifyListenerHandle = {
          unlisten: null,
          interval: null,
          debounceTimeout: null,
        };

        const batcher = createDebouncedBatcher<EntityInfo>((items) => {
          for (const entity of items.values()) {
            listener(entity);
          }
        }, debounceMs);

        (async () => {
          try {
            const unlisten = await notifyEvents.fileChanged.listen((event) => {
              const { path } = event.payload;
              if (!pathMatcher(path)) return;

              const entityId = entityParser(path);
              if (!entityId) return;

              batcher.add(entityId, { entityId, path });
              handle.debounceTimeout = batcher.getTimeoutHandle();
            });
            handle.unlisten = unlisten;
          } catch (error) {
            console.error(
              "[FileListener:entity] Failed to setup notify listener:",
              error,
            );
          }
        })();

        return handle;
      },
      delListener,
    } as FileListenerResult<TConfig>;
  }

  const { pathMatcher, fallbackIntervalMs = FALLBACK_POLL_INTERVAL } = config;
  return {
    addListener: (listener: SimpleListener) => {
      const handle: NotifyListenerHandle = { unlisten: null, interval: null };

      (async () => {
        try {
          const unlisten = await notifyEvents.fileChanged.listen((event) => {
            if (pathMatcher(event.payload.path)) {
              listener();
            }
          });
          handle.unlisten = unlisten;
        } catch (error) {
          console.error(
            "[FileListener:simple] Failed to setup, using polling:",
            error,
          );
          handle.interval = setInterval(listener, fallbackIntervalMs);
        }
      })();

      return handle;
    },
    delListener,
  } as FileListenerResult<TConfig>;
}
