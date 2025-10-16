import type { StoreApi } from "zustand";

import type { LifecycleState } from "./lifecycle";
import type { NavigationState } from "./navigation";
import type { Tab, TabHistory } from "./schema";
import { isSameTab, tabSchema } from "./schema";
import { computeHistoryFlags, getSlotId, notifyTabClose, notifyTabsClose, pushHistory } from "./utils";

export type BasicState = {
  currentTab: Tab | null;
  tabs: Tab[];
};

export type BasicActions = {
  setTabs: (tabs: Tab[]) => void;
  openCurrent: (tab: Tab) => void;
  openNew: (tab: Tab) => void;
  select: (tab: Tab) => void;
  close: (tab: Tab) => void;
  reorder: (tabs: Tab[]) => void;
  closeOthers: (tab: Tab) => void;
  closeAll: () => void;
};

export const createBasicSlice = <T extends BasicState & NavigationState & LifecycleState>(
  set: StoreApi<T>["setState"],
  get: StoreApi<T>["getState"],
): BasicState & BasicActions => ({
  currentTab: null,
  tabs: [],
  setTabs: (tabs) => {
    const tabsWithDefaults = tabs.map(t => tabSchema.parse(t));
    const currentTab = tabsWithDefaults.find((t) => t.active) || null;
    const history = new Map<string, TabHistory>();

    tabsWithDefaults.forEach((tab) => {
      if (tab.active) {
        history.set(getSlotId(tab), { stack: [tab], currentIndex: 0 });
      }
    });

    const flags = computeHistoryFlags(history, currentTab);
    set({ tabs: tabsWithDefaults, currentTab, history, ...flags } as Partial<T>);
  },
  openCurrent: (newTab) => {
    const { tabs, history, onCloseHandlers } = get();
    const tabWithDefaults = tabSchema.parse(newTab);
    const activeTab = { ...tabWithDefaults, active: true };
    const existingTabIdx = tabs.findIndex((t) => t.active);

    const tabsToClose: Tab[] = [];
    if (existingTabIdx !== -1) {
      tabsToClose.push(tabs[existingTabIdx]);
    }
    tabs.forEach((tab) => {
      if (!tab.active && isSameTab(tab, tabWithDefaults)) {
        tabsToClose.push(tab);
      }
    });

    notifyTabsClose(onCloseHandlers, tabsToClose);

    const nextTabs = existingTabIdx === -1
      ? tabs
        .filter((t) => !isSameTab(t, tabWithDefaults))
        .map((t) => ({ ...t, active: false }))
        .concat([activeTab])
      : tabs
        .map((t, idx) =>
          idx === existingTabIdx
            ? activeTab
            : isSameTab(t, tabWithDefaults)
            ? null
            : { ...t, active: false }
        )
        .filter((t): t is Tab => t !== null);

    const nextHistory = pushHistory(history, activeTab);
    const flags = computeHistoryFlags(nextHistory, activeTab);
    set({ tabs: nextTabs, currentTab: activeTab, history: nextHistory, ...flags } as Partial<T>);
  },
  openNew: (tab) => {
    const { tabs, history, onCloseHandlers } = get();
    const tabWithDefaults = tabSchema.parse(tab);
    const activeTab = { ...tabWithDefaults, active: true };
    const tabsToClose = tabs.filter((t) => isSameTab(t, tabWithDefaults));
    notifyTabsClose(onCloseHandlers, tabsToClose);
    const nextTabs = tabs
      .filter((t) => !isSameTab(t, tabWithDefaults))
      .map((t) => ({ ...t, active: false }))
      .concat([activeTab]);
    const nextHistory = pushHistory(history, activeTab);
    const flags = computeHistoryFlags(nextHistory, activeTab);
    set({ tabs: nextTabs, currentTab: activeTab, history: nextHistory, ...flags } as Partial<T>);
  },
  select: (tab) => {
    const { tabs, history } = get();
    const nextTabs = tabs.map((t) => ({ ...t, active: isSameTab(t, tab) }));
    const flags = computeHistoryFlags(history, tab);
    set({ tabs: nextTabs, currentTab: tab, ...flags } as Partial<T>);
  },
  close: (tab) => {
    const { tabs, history, onCloseHandlers } = get();
    const remainingTabs = tabs.filter((t) => !isSameTab(t, tab));

    notifyTabClose(onCloseHandlers, tab);

    if (remainingTabs.length === 0) {
      return set({
        tabs: [] as Tab[],
        currentTab: null,
        history: new Map(),
        canGoBack: false,
        canGoNext: false,
      } as Partial<T>);
    }

    const closedTabIndex = tabs.findIndex((t) => isSameTab(t, tab));
    const nextActiveIndex = closedTabIndex < remainingTabs.length
      ? closedTabIndex
      : remainingTabs.length - 1;

    const nextTabs = remainingTabs.map((t, idx) => ({ ...t, active: idx === nextActiveIndex }));
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
    const { tabs, history, onCloseHandlers } = get();
    const tabsToClose = tabs.filter((t) => !isSameTab(t, tab));

    notifyTabsClose(onCloseHandlers, tabsToClose);

    const nextHistory = new Map(history);
    tabsToClose.forEach((t) => {
      nextHistory.delete(getSlotId(t));
    });

    const nextTabs = [{ ...tab, active: true }];
    const nextCurrentTab = nextTabs[0];
    const flags = computeHistoryFlags(nextHistory, nextCurrentTab);
    set({
      tabs: nextTabs,
      currentTab: nextCurrentTab,
      history: nextHistory,
      ...flags,
    } as Partial<T>);
  },
  closeAll: () => {
    const { tabs, onCloseHandlers } = get();
    notifyTabsClose(onCloseHandlers, tabs);
    set({
      tabs: [],
      currentTab: null,
      history: new Map(),
      canGoBack: false,
      canGoNext: false,
    } as unknown as Partial<T>);
  },
});
