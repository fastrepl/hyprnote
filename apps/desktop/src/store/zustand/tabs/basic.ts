import type { StoreApi } from "zustand";

import { id } from "../../../utils";
import type { LifecycleState } from "./lifecycle";
import type { NavigationState, TabHistory } from "./navigation";
import { pushHistory } from "./navigation";
import { isSameTab, type Tab, type TabInput, tabSchema } from "./schema";

export type BasicState = {
  tabs: Tab[];
  currentTab: Tab | null;
};

export type BasicActions = {
  openCurrent: (tab: TabInput) => void;
  openNew: (tab: TabInput) => void;
  select: (tab: Tab) => void;
  close: (tab: Tab) => void;
  reorder: (tabs: Tab[]) => void;
  closeOthers: (tab: Tab) => void;
  closeAll: () => void;
};

export const createBasicSlice = <
  T extends BasicState & NavigationState & LifecycleState,
>(
  set: StoreApi<T>["setState"],
  get: StoreApi<T>["getState"],
): BasicState & BasicActions => ({
  tabs: [],
  currentTab: null,
  openCurrent: (tab) => {
    const { tabs, history } = get();
    set(openTab(tabs, tab, history, true));
  },
  openNew: (tab) => {
    const { tabs, history } = get();
    set(openTab(tabs, tab, history, false));
  },
  select: (tab) => {
    const { tabs } = get();
    const nextTabs = setActiveFlags(tabs, tab);
    const currentTab = nextTabs.find((t) => t.active) || null;
    set({ tabs: nextTabs, currentTab } as Partial<T>);
  },
  close: (tab) => {
    const { tabs, history } = get();
    const tabToClose = tabs.find((t) => isSameTab(t, tab));

    if (!tabToClose) {
      return;
    }

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
    const nextTabs = setActiveFlags(
      remainingTabs,
      remainingTabs[nextActiveIndex],
    );
    const nextCurrentTab = nextTabs[nextActiveIndex];

    const nextHistory = new Map(history);
    nextHistory.delete(tabToClose.slotId);

    set({
      tabs: nextTabs,
      currentTab: nextCurrentTab,
      history: nextHistory,
    } as Partial<T>);
  },
  reorder: (tabs) => {
    const currentTab = tabs.find((t) => t.active) || null;
    set({ tabs, currentTab } as Partial<T>);
  },
  closeOthers: (tab) => {
    const { tabs, history } = get();
    const tabToKeep = tabs.find((t) => isSameTab(t, tab));

    if (!tabToKeep) {
      return;
    }

    const nextHistory = new Map(history);
    const tabWithActiveFlag = { ...tabToKeep, active: true };
    const nextTabs = [tabWithActiveFlag];

    Array.from(history.keys()).forEach((slotId) => {
      if (slotId !== tabToKeep.slotId) {
        nextHistory.delete(slotId);
      }
    });

    set({
      tabs: nextTabs,
      currentTab: tabWithActiveFlag,
      history: nextHistory,
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
  return { tabs, currentTab, history: nextHistory } as Partial<T>;
};

const openTab = <T extends BasicState & NavigationState>(
  tabs: Tab[],
  newTab: TabInput,
  history: Map<string, TabHistory>,
  replaceActive: boolean,
): Partial<T> => {
  const tabWithDefaults: Tab = tabSchema.parse({
    ...newTab,
    active: false,
    slotId: id(),
  });

  let nextTabs: Tab[];
  let activeTab: Tab;

  const existingTab = tabs.find((t) => isSameTab(t, tabWithDefaults));
  const isNewTab = !existingTab;

  if (replaceActive) {
    const existingActiveIdx = tabs.findIndex((t) => t.active);
    const currentActiveTab = tabs[existingActiveIdx];

    if (existingActiveIdx !== -1 && currentActiveTab) {
      activeTab = {
        ...tabWithDefaults,
        active: true,
        slotId: currentActiveTab.slotId,
      };

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
      activeTab = { ...tabWithDefaults, active: true, slotId: id() };
      const withoutDuplicates = removeDuplicates(tabs, tabWithDefaults);
      const deactivated = deactivateAll(withoutDuplicates);
      nextTabs = [...deactivated, activeTab];
    }

    return updateWithHistory(nextTabs, activeTab, history);
  } else {
    if (!isNewTab) {
      nextTabs = setActiveFlags(tabs, existingTab!);
      const currentTab = { ...existingTab!, active: true };
      return { tabs: nextTabs, currentTab, history } as Partial<T>;
    }

    activeTab = { ...tabWithDefaults, active: true, slotId: id() };
    const deactivated = deactivateAll(tabs);
    nextTabs = [...deactivated, activeTab];

    return updateWithHistory(nextTabs, activeTab, history);
  }
};
