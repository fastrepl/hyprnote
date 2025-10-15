import { z } from "zod";
import { create } from "zustand";

import { TABLES } from "../tinybase/persisted";

type TabHistory = {
  stack: Tab[];
  currentIndex: number;
};

type State = {
  currentTab: Tab | null;
  tabs: Tab[];
  history: Map<string, TabHistory>;
  canGoBack: boolean;
  canGoNext: boolean;
  onCloseHandlers: Set<(tab: Tab) => void>;
};

type Actions =
  & TabUpdater
  & TabStateUpdater
  & TabNavigator
  & TabLifecycle;

type TabUpdater = {
  setTabs: (tabs: Tab[]) => void;
  openCurrent: (tab: Tab) => void;
  openNew: (tab: Tab) => void;
  select: (tab: Tab) => void;
  close: (tab: Tab) => void;
  reorder: (tabs: Tab[]) => void;
};

type TabStateUpdater = {
  updateContactsTabState: (tab: Tab, state: Extract<Tab, { type: "contacts" }>["state"]) => void;
  updateSessionTabState: (tab: Tab, state: Extract<Tab, { type: "sessions" }>["state"]) => void;
};

type TabNavigator = {
  goBack: () => void;
  goNext: () => void;
};

type TabLifecycle = {
  registerOnClose: (handler: (tab: Tab) => void) => () => void;
};

type Store = State & Actions;

const ACTIVE_TAB_SLOT_ID = "active-tab-history";

const getSlotId = (tab: Tab): string => {
  return tab.active ? ACTIVE_TAB_SLOT_ID : `inactive-${uniqueIdfromTab(tab)}`;
};

const notifyTabClose = (
  handlers: Set<(tab: Tab) => void>,
  tab: Tab,
): void => {
  handlers.forEach((handler) => {
    try {
      handler(tab);
    } catch (error) {
      console.error("tab onClose handler failed", error);
    }
  });
};

const notifyTabsClose = (
  handlers: Set<(tab: Tab) => void>,
  tabs: Tab[],
): void => {
  tabs.forEach((tab) => notifyTabClose(handlers, tab));
};

const computeHistoryFlags = (
  history: Map<string, TabHistory>,
  currentTab: Tab | null,
): { canGoBack: boolean; canGoNext: boolean } => {
  if (!currentTab) {
    return { canGoBack: false, canGoNext: false };
  }
  const slotId = getSlotId(currentTab);
  const tabHistory = history.get(slotId);
  if (!tabHistory) {
    return { canGoBack: false, canGoNext: false };
  }
  return {
    canGoBack: tabHistory.currentIndex > 0,
    canGoNext: tabHistory.currentIndex < tabHistory.stack.length - 1,
  };
};

const pushHistory = (history: Map<string, TabHistory>, tab: Tab): Map<string, TabHistory> => {
  const newHistory = new Map(history);
  const slotId = getSlotId(tab);
  const existing = newHistory.get(slotId);

  if (existing) {
    const newStack = existing.stack.slice(0, existing.currentIndex + 1);
    newStack.push(tab);
    newHistory.set(slotId, { stack: newStack, currentIndex: newStack.length - 1 });
  } else {
    newHistory.set(slotId, { stack: [tab], currentIndex: 0 });
  }

  return newHistory;
};

const updateHistoryCurrent = (history: Map<string, TabHistory>, tab: Tab): Map<string, TabHistory> => {
  const newHistory = new Map(history);
  const slotId = getSlotId(tab);
  const existing = newHistory.get(slotId);

  if (existing && existing.currentIndex >= 0) {
    const newStack = [...existing.stack];
    newStack[existing.currentIndex] = tab;
    newHistory.set(slotId, { ...existing, stack: newStack });
  }

  return newHistory;
};

export const useTabs = create<Store>((set, get, _store) => ({
  currentTab: null,
  tabs: [],
  history: new Map(),
  canGoBack: false,
  canGoNext: false,
  onCloseHandlers: new Set(),
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
    set({ tabs: tabsWithDefaults, currentTab, history, ...flags });
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
    set({ tabs: nextTabs, currentTab: activeTab, history: nextHistory, ...flags });
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
    set({ tabs: nextTabs, currentTab: activeTab, history: nextHistory, ...flags });
  },
  select: (tab) => {
    const { tabs, history } = get();
    const nextTabs = tabs.map((t) => ({ ...t, active: isSameTab(t, tab) }));
    const flags = computeHistoryFlags(history, tab);
    set({ tabs: nextTabs, currentTab: tab, ...flags });
  },
  close: (tab) => {
    const { tabs, history, onCloseHandlers } = get();
    const remainingTabs = tabs.filter((t) => !isSameTab(t, tab));

    notifyTabClose(onCloseHandlers, tab);

    if (remainingTabs.length === 0) {
      return set({
        tabs: [],
        currentTab: null,
        canGoBack: false,
        canGoNext: false,
      });
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
    });
  },
  reorder: (tabs) => {
    const { history } = get();
    const currentTab = tabs.find((t) => t.active) || null;
    const flags = computeHistoryFlags(history, currentTab);
    set({ tabs, currentTab, ...flags });
  },
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

    set({ tabs: nextTabs, currentTab: nextCurrentTab, history: nextHistory });
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

    set({ tabs: nextTabs, currentTab: nextCurrentTab, history: nextHistory });
  },
  registerOnClose: (handler) => {
    const { onCloseHandlers } = get();
    const nextHandlers = new Set(onCloseHandlers);
    nextHandlers.add(handler);
    set({ onCloseHandlers: nextHandlers });
    return () => {
      const { onCloseHandlers: currentHandlers } = get();
      const nextHandlers = new Set(currentHandlers);
      nextHandlers.delete(handler);
      set({ onCloseHandlers: nextHandlers });
    };
  },
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
    set({ tabs: nextTabs, currentTab: prevTab, history: nextHistory, ...flags });
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
    set({ tabs: nextTabs, currentTab: nextTab, history: nextHistory, ...flags });
  },
}));

const baseTabSchema = z.object({
  active: z.boolean(),
});

export const tabSchema = z.discriminatedUnion("type", [
  baseTabSchema.extend({
    type: z.literal("sessions" satisfies typeof TABLES[number]),
    id: z.string(),
    state: z.object({
      editor: z.enum(["raw", "enhanced", "transcript"]).default("raw"),
    }).default({ editor: "raw" }),
  }),
  baseTabSchema.extend({
    type: z.literal("contacts"),
    state: z.object({
      selectedOrganization: z.string().nullable().default(null),
      selectedPerson: z.string().nullable().default(null),
    }).default({
      selectedOrganization: null,
      selectedPerson: null,
    }),
  }),
  baseTabSchema.extend({
    type: z.literal("events" satisfies typeof TABLES[number]),
    id: z.string(),
  }),
  baseTabSchema.extend({
    type: z.literal("humans" satisfies typeof TABLES[number]),
    id: z.string(),
  }),
  baseTabSchema.extend({
    type: z.literal("organizations" satisfies typeof TABLES[number]),
    id: z.string(),
  }),
  baseTabSchema.extend({
    type: z.literal("folders" satisfies typeof TABLES[number]),
    id: z.string().nullable(),
  }),

  baseTabSchema.extend({
    type: z.literal("calendars"),
    month: z.coerce.date(),
  }),
  baseTabSchema.extend({
    type: z.literal("daily"),
    date: z.coerce.date(),
  }),
]);

export type Tab = z.infer<typeof tabSchema>;

export const rowIdfromTab = (tab: Tab): string => {
  switch (tab.type) {
    case "sessions":
      return tab.id;
    case "events":
      return tab.id;
    case "humans":
      return tab.id;
    case "organizations":
      return tab.id;
    case "calendars":
    case "contacts":
    case "daily":
      throw new Error("invalid_resource");
    case "folders":
      if (!tab.id) {
        throw new Error("invalid_resource");
      }
      return tab.id;
  }
};

export const uniqueIdfromTab = (tab: Tab): string => {
  switch (tab.type) {
    case "sessions":
      return `sessions-${tab.id}`;
    case "events":
      return `events-${tab.id}`;
    case "humans":
      return `humans-${tab.id}`;
    case "organizations":
      return `organizations-${tab.id}`;
    case "calendars":
      return `calendars-${tab.month.getFullYear()}-${tab.month.getMonth()}`;
    case "contacts":
      return `contacts`;
    case "daily":
      return `daily-${tab.date.getFullYear()}-${tab.date.getMonth()}-${tab.date.getDate()}`;
    case "folders":
      return `folders-${tab.id ?? "all"}`;
  }
};

export const isSameTab = (a: Tab, b: Tab) => {
  return uniqueIdfromTab(a) === uniqueIdfromTab(b);
};
