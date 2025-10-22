import type { StoreApi } from "zustand";

import type { LifecycleState } from "./lifecycle";
import type { NavigationState } from "./navigation";
import { isSameTab, type Tab, type TabHistory, tabSchema } from "./schema";
import { computeHistoryFlags, getSlotId, pushHistory } from "./utils";

export type BasicState = {
  currentTab: Tab | null;
  tabs: Tab[];
};

export type BasicActions = {
  openCurrent: (tab: Tab) => void;
  openNew: (tab: Tab) => void;
  select: (tab: Tab) => void;
  close: (tab: Tab) => void;
  reorder: (tabs: Tab[]) => void;
  closeOthers: (tab: Tab) => void;
  closeAll: () => void;
};

const removeDuplicates = (tabs: Tab[], newTab: Tab): Tab[] => {
  return tabs.filter((t) => !isSameTab(t, newTab));
};

const setActiveFlags = (tabs: Tab[], activeTab: Tab): Tab[] => {
  return tabs.map((t) => ({ ...t, active: isSameTab(t, activeTab) }));
};

const deactivateAll = (tabs: Tab[]): Tab[] => {
  return tabs.map((t) => ({ ...t, active: false }));
};

const findNextActiveIndex = (tabs: Tab[], closedIndex: number): number => {
  return closedIndex < tabs.length ? closedIndex : tabs.length - 1;
};

const updateWithHistory = <T extends BasicState & NavigationState>(
  tabs: Tab[],
  currentTab: Tab,
  history: Map<string, TabHistory>,
): Partial<T> => {
  const nextHistory = pushHistory(history, currentTab);
  const flags = computeHistoryFlags(nextHistory, currentTab);
  return { tabs, currentTab, history: nextHistory, ...flags } as Partial<T>;
};

const openTab = <T extends BasicState & NavigationState>(
  tabs: Tab[],
  newTab: Tab,
  history: Map<string, TabHistory>,
  replaceActive: boolean,
): Partial<T> => {
  const tabWithDefaults = tabSchema.parse(newTab);
  const activeTab = { ...tabWithDefaults, active: true };

  let nextTabs: Tab[];

  const existingTab = tabs.find((t) => isSameTab(t, tabWithDefaults));
  const isNewTab = !existingTab;

  if (replaceActive) {
    const existingActiveIdx = tabs.findIndex((t) => t.active);

    if (existingActiveIdx !== -1) {
      nextTabs = tabs
        .map((t, idx) => {
          if (idx === existingActiveIdx) {
            return activeTab;
          }
          if (isSameTab(t, tabWithDefaults)) {
            return null;
          }
          return { ...t, active: false };
        })
        .filter((t): t is Tab => t !== null);
    } else {
      const withoutDuplicates = removeDuplicates(tabs, tabWithDefaults);
      const deactivated = deactivateAll(withoutDuplicates);
      nextTabs = [...deactivated, activeTab];
    }
  } else {
    if (!isNewTab) {
      nextTabs = setActiveFlags(tabs, existingTab!);
      const currentTab = { ...existingTab!, active: true };
      const flags = computeHistoryFlags(history, currentTab);
      return { tabs: nextTabs, currentTab, history, ...flags } as Partial<T>;
    }

    const deactivated = deactivateAll(tabs);
    nextTabs = [...deactivated, activeTab];
  }

  if (isNewTab) {
    return updateWithHistory(nextTabs, activeTab, history);
  }

  const flags = computeHistoryFlags(history, activeTab);
  return { tabs: nextTabs, currentTab: activeTab, history, ...flags } as Partial<T>;
};

export const createBasicSlice = <T extends BasicState & NavigationState & LifecycleState>(
  set: StoreApi<T>["setState"],
  get: StoreApi<T>["getState"],
): BasicState & BasicActions => ({
  currentTab: null,
  tabs: [],
  openCurrent: (newTab) => {
    const { tabs, history } = get();
    set(openTab(tabs, newTab, history, true));
  },
  openNew: (tab) => {
    const { tabs, history } = get();
    set(openTab(tabs, tab, history, false));
  },
  select: (tab) => {
    const { tabs, history } = get();
    const nextTabs = setActiveFlags(tabs, tab);
    const flags = computeHistoryFlags(history, tab);
    set({ tabs: nextTabs, currentTab: tab, ...flags } as Partial<T>);
  },
  close: (tab) => {
    const { tabs, history } = get();
    const remainingTabs = tabs.filter((t) => !isSameTab(t, tab));

    if (remainingTabs.length === 0) {
      set({
        tabs: [],
        currentTab: null,
        history: new Map(),
        canGoBack: false,
        canGoNext: false,
      } as unknown as Partial<T>);
      return;
    }

    const closedTabIndex = tabs.findIndex((t) => isSameTab(t, tab));
    const nextActiveIndex = findNextActiveIndex(remainingTabs, closedTabIndex);
    const nextTabs = setActiveFlags(remainingTabs, remainingTabs[nextActiveIndex]);
    const nextCurrentTab = nextTabs[nextActiveIndex];

    const nextHistory = new Map(history);
    nextHistory.delete(getSlotId(tab));

    const flags = computeHistoryFlags(nextHistory, nextCurrentTab);
    set({
      tabs: nextTabs,
      currentTab: nextCurrentTab,
      history: nextHistory,
      ...flags,
    } as Partial<T>);
  },
  reorder: (tabs) => {
    const { history } = get();
    const currentTab = tabs.find((t) => t.active) || null;
    const flags = computeHistoryFlags(history, currentTab);
    set({ tabs, currentTab, ...flags } as Partial<T>);
  },
  closeOthers: (tab) => {
    const { history } = get();
    const nextHistory = new Map(history);

    const tabWithActiveFlag = { ...tab, active: true };
    const nextTabs = [tabWithActiveFlag];

    Array.from(history.keys()).forEach((slotId) => {
      if (slotId !== getSlotId(tabWithActiveFlag)) {
        nextHistory.delete(slotId);
      }
    });

    const flags = computeHistoryFlags(nextHistory, tabWithActiveFlag);
    set({
      tabs: nextTabs,
      currentTab: tabWithActiveFlag,
      history: nextHistory,
      ...flags,
    } as Partial<T>);
  },
  closeAll: () => {
    set({
      tabs: [],
      currentTab: null,
      history: new Map(),
      canGoBack: false,
      canGoNext: false,
    } as unknown as Partial<T>);
  },
});
