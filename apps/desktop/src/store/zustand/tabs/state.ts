import type { StoreApi } from "zustand";

import type { BasicState } from "./basic";
import type { NavigationState } from "./navigation";
import { isSameTab, type Tab } from "./schema";
import { updateHistoryCurrent } from "./utils";

export type StateBasicActions = {
  updateContactsTabState: (tab: Tab, state: Extract<Tab, { type: "contacts" }>["state"]) => void;
  updateSessionTabState: (tab: Tab, state: Extract<Tab, { type: "sessions" }>["state"]) => void;
};

export const createStateUpdaterSlice = <T extends BasicState & NavigationState>(
  set: StoreApi<T>["setState"],
  get: StoreApi<T>["getState"],
): StateBasicActions => ({
  updateSessionTabState: (tab, state) => updateTabState(tab, "sessions", state, get, set),
  updateContactsTabState: (tab, state) => updateTabState(tab, "contacts", state, get, set),
});

const updateTabState = <T extends BasicState & NavigationState>(
  tab: Tab,
  tabType: Tab["type"],
  newState: any,
  get: StoreApi<T>["getState"],
  set: StoreApi<T>["setState"],
) => {
  const { tabs, currentTab, history } = get();

  const nextTabs = tabs.map((t) =>
    isSameTab(t, tab) && t.type === tabType
      ? { ...t, state: newState }
      : t
  );

  const nextCurrentTab = currentTab && isSameTab(currentTab, tab) && currentTab.type === tabType
    ? { ...currentTab, state: newState }
    : currentTab;

  const nextHistory = nextCurrentTab && isSameTab(nextCurrentTab, tab)
    ? updateHistoryCurrent(history, nextCurrentTab)
    : history;

  set({ tabs: nextTabs, currentTab: nextCurrentTab, history: nextHistory } as Partial<T>);
};
