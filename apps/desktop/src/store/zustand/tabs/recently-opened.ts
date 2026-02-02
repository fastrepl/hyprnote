import type { StoreApi } from "zustand";

import type { Store } from "../../tinybase/store/main";

const MAX_RECENT_SESSIONS = 10;

export type RecentlyOpenedState = {
  recentlyOpenedSessionIds: string[];
};

export type RecentlyOpenedActions = {
  addRecentlyOpened: (sessionId: string) => void;
};

export const createRecentlyOpenedSlice = <T extends RecentlyOpenedState>(
  set: StoreApi<T>["setState"],
  get: StoreApi<T>["getState"],
): RecentlyOpenedState & RecentlyOpenedActions => ({
  recentlyOpenedSessionIds: [],
  addRecentlyOpened: (sessionId: string) => {
    const { recentlyOpenedSessionIds } = get();
    const filtered = recentlyOpenedSessionIds.filter((id) => id !== sessionId);
    const updated = [sessionId, ...filtered].slice(0, MAX_RECENT_SESSIONS);
    set({ recentlyOpenedSessionIds: updated } as Partial<T>);
  },
});

export const saveRecentlyOpenedSessions = (
  store: Store,
  sessionIds: string[],
): void => {
  const serialized = JSON.stringify(sessionIds);
  store.setValue("recently_opened_sessions", serialized);
};

export const loadRecentlyOpenedSessions = (store: Store): string[] => {
  const data = store.getValue("recently_opened_sessions");
  if (typeof data === "string") {
    try {
      const parsed = JSON.parse(data);
      if (
        Array.isArray(parsed) &&
        parsed.every((id) => typeof id === "string")
      ) {
        return parsed;
      }
      return [];
    } catch {
      return [];
    }
  }
  return [];
};
