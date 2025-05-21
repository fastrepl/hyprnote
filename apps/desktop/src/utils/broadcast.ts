// Based on https://github.com/TanStack/query/blob/6d03341/packages/query-broadcast-client-experimental/src/index.ts

import type { QueryCacheNotifyEvent, QueryClient } from "@tanstack/react-query";
import { emit, listen, type UnlistenFn } from "@tauri-apps/api/event";

import { getCurrentWebviewWindowLabel } from "@hypr/plugin-windows";

const EVENT_NAME = "tanstack-query-broadcast";

type BroadcastEvent = {
  queryKey: QueryCacheNotifyEvent["query"]["queryKey"];
  window: string;
};

export function broadcastQueryClient(queryClient: QueryClient) {
  const queryCache = queryClient.getQueryCache();
  const currentWindow = getCurrentWebviewWindowLabel();

  queryCache.subscribe((queryEvent) => {
    const updated = queryEvent.type === "updated" && queryEvent.action.type === "success";
    const removed = queryEvent.type === "removed";

    if (updated || removed) {
      emit(
        EVENT_NAME,
        {
          queryKey: queryEvent.query.queryKey,
          window: currentWindow,
        } satisfies BroadcastEvent,
      );
    }
  });

  let unlisten: UnlistenFn | null = null;

  const setup = async () => {
    unlisten = await listen<BroadcastEvent>(EVENT_NAME, (event) => {
      if (event.payload.window === currentWindow) {
        return;
      }

      const keys = event.payload.queryKey as string[];

      if (keys.some((key) => key?.includes("extension"))) {
        queryClient.invalidateQueries({
          predicate: (query) => query.queryKey.some((key) => typeof key === "string" && key.includes("extension")),
        });
      }

      if (keys.some((key) => key?.includes("flags"))) {
        queryClient.invalidateQueries({
          predicate: (query) => query.queryKey.some((key) => typeof key === "string" && key.includes("flags")),
        });
      }

      if (keys.some((key) => key?.includes("profile"))) {
        queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey.some((key) =>
              typeof key === "string" && (key.includes("participant") || key.includes("human") || key.includes("org"))
            ),
        });
      }

      if (keys[0] === "human") {
        queryClient.invalidateQueries({
          queryKey: ["human", keys[1]],
          predicate: (query) =>
            query.queryKey.some((key) => typeof key === "string" && key.includes("grouped-participants")),
        });
      }

      if (keys[0] === "org") {
        queryClient.invalidateQueries({
          queryKey: ["org", keys[1]],
        });
      }
    });
  };

  setup();

  return () => {
    if (unlisten) {
      unlisten();
    }
  };
}
