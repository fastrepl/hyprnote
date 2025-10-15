import type { StoreApi } from "zustand";

import type { BasicState } from "./basic";
import type { TabHistory } from "./schema";
import { computeHistoryFlags, getSlotId } from "./utils";

export type NavigationState = {
  history: Map<string, TabHistory>;
  canGoBack: boolean;
  canGoNext: boolean;
};

export type NavigationActions = {
  goBack: () => void;
  goNext: () => void;
};

export const createNavigationSlice = <T extends NavigationState & BasicState>(
  set: StoreApi<T>["setState"],
  get: StoreApi<T>["getState"],
): NavigationState & NavigationActions => ({
  history: new Map(),
  canGoBack: false,
  canGoNext: false,
  goBack: () => {
    const { tabs, history, currentTab } = get();
    if (!currentTab) {
      return;
    }

    const slotId = getSlotId(currentTab);
    const tabHistory = history.get(slotId);
    if (!tabHistory || tabHistory.currentIndex === 0) {
      return;
    }

    const prevIndex = tabHistory.currentIndex - 1;
    const prevTab = tabHistory.stack[prevIndex];

    const nextTabs = tabs.map((t) => t.active ? prevTab : t);

    const nextHistory = new Map(history);
    nextHistory.set(slotId, { ...tabHistory, currentIndex: prevIndex });

    const flags = computeHistoryFlags(nextHistory, prevTab);
    set({ tabs: nextTabs, currentTab: prevTab, history: nextHistory, ...flags } as Partial<T>);
  },
  goNext: () => {
    const { tabs, history, currentTab } = get();
    if (!currentTab) {
      return;
    }

    const slotId = getSlotId(currentTab);
    const tabHistory = history.get(slotId);
    if (!tabHistory || tabHistory.currentIndex >= tabHistory.stack.length - 1) {
      return;
    }

    const nextIndex = tabHistory.currentIndex + 1;
    const nextTab = tabHistory.stack[nextIndex];

    const nextTabs = tabs.map((t) => t.active ? nextTab : t);

    const nextHistory = new Map(history);
    nextHistory.set(slotId, { ...tabHistory, currentIndex: nextIndex });

    const flags = computeHistoryFlags(nextHistory, nextTab);
    set({ tabs: nextTabs, currentTab: nextTab, history: nextHistory, ...flags } as Partial<T>);
  },
});
