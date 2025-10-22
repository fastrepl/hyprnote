import type { StoreApi } from "zustand";

import type { BasicState } from "./basic";
import { type Tab, uniqueIdfromTab } from "./schema";

export type NavigationState = {
  history: HistoryMap;
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

export type SlotId = string;
export type TabHistory = { stack: Tab[]; currentIndex: number };
export type HistoryMap = Map<SlotId, TabHistory>;

export const getSlotId = (tab: Tab): SlotId => uniqueIdfromTab(tab);

export const computeHistoryFlags = (
  history: Map<string, TabHistory>,
  currentTab: Tab | null,
): {
  canGoBack: boolean;
  canGoNext: boolean;
} => {
  const tabHistory = currentTab ? history.get(getSlotId(currentTab)) : null;

  return {
    canGoBack: tabHistory ? tabHistory.currentIndex > 0 : false,
    canGoNext: tabHistory ? tabHistory.currentIndex < tabHistory.stack.length - 1 : false,
  };
};

export const pushHistory = (history: Map<string, TabHistory>, tab: Tab): Map<string, TabHistory> => {
  const newHistory = new Map(history);
  const slotId = getSlotId(tab);
  const existing = newHistory.get(slotId);

  const stack = existing
    ? [...existing.stack.slice(0, existing.currentIndex + 1), tab]
    : [tab];

  newHistory.set(slotId, { stack, currentIndex: stack.length - 1 });
  return newHistory;
};

export const updateHistoryCurrent = (history: Map<string, TabHistory>, tab: Tab): Map<string, TabHistory> => {
  const newHistory = new Map(history);
  const slotId = getSlotId(tab);
  const existing = newHistory.get(slotId);

  if (!existing) {
    return newHistory;
  }

  const stack = [...existing.stack];
  stack[existing.currentIndex] = tab;
  newHistory.set(slotId, { ...existing, stack });

  return newHistory;
};
