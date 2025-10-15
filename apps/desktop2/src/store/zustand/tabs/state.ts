import type { StoreApi } from "zustand";

import type { BasicState } from "./basic";
import type { NavigationState } from "./navigation";
import type { Tab } from "./schema";
import { isSameTab } from "./schema";
import { updateHistoryCurrent } from "./utils";

export type StateBasicActions = {
  updateContactsTabState: (tab: Tab, state: Extract<Tab, { type: "contacts" }>["state"]) => void;
  updateSessionTabState: (tab: Tab, state: Extract<Tab, { type: "sessions" }>["state"]) => void;
};

export const createStateUpdaterSlice = <T extends BasicState & NavigationState>(
  set: StoreApi<T>["setState"],
  get: StoreApi<T>["getState"],
): StateBasicActions => ({
  updateSessionTabState: (tab, state) => {
    const { tabs, currentTab, history } = get();
    const nextTabs = tabs.map((t) =>
      isSameTab(t, tab) && t.type === "sessions"
        ? { ...t, state }
        : t
    );
    const nextCurrentTab = currentTab && isSameTab(currentTab, tab) && currentTab.type === "sessions"
      ? { ...currentTab, state }
      : currentTab;

    const nextHistory = nextCurrentTab && isSameTab(nextCurrentTab, tab)
      ? updateHistoryCurrent(history, nextCurrentTab)
      : history;

    set({ tabs: nextTabs, currentTab: nextCurrentTab, history: nextHistory } as Partial<T>);
  },
  updateContactsTabState: (tab, state) => {
    const { tabs, currentTab, history } = get();
    const nextTabs = tabs.map((t) =>
      isSameTab(t, tab) && t.type === "contacts"
        ? { ...t, state }
        : t
    );

    const nextCurrentTab = currentTab && isSameTab(currentTab, tab) && currentTab.type === "contacts"
      ? { ...currentTab, state }
      : currentTab;

    const nextHistory = nextCurrentTab && isSameTab(nextCurrentTab, tab)
      ? updateHistoryCurrent(history, nextCurrentTab)
      : history;

    set({ tabs: nextTabs, currentTab: nextCurrentTab, history: nextHistory } as Partial<T>);
  },
});
