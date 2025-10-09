import { z } from "zod";
import { create } from "zustand";

import { TABLES } from "../tinybase/persisted";

type State = {
  currentTab: Tab | null;
  tabs: Tab[];
};

type Actions = {
  setTabs: (tabs: Tab[]) => void;
  openCurrent: (tab: Tab) => void;
  openNew: (tab: Tab) => void;
  select: (tab: Tab) => void;
  close: (tab: Tab) => void;
  reorder: (tabs: Tab[]) => void;
};

type Store = State & Actions;

export const useTabs = create<Store>((set, get, _store) => ({
  currentTab: null,
  tabs: [],
  setTabs: (tabs) => set({ tabs, currentTab: tabs.find((t) => t.active) || null }),
  openCurrent: (newTab) => {
    const { tabs } = get();
    const existingTabIdx = tabs.findIndex((t) => t.active);

    if (existingTabIdx === -1) {
      const nextTabs = tabs
        .filter((t) => !isSameTab(t, newTab))
        .map((t) => ({ ...t, active: false }))
        .concat([{ ...newTab, active: true }]);
      set({ tabs: nextTabs, currentTab: newTab });
    } else {
      const nextTabs = tabs
        .map((t, idx) =>
          idx === existingTabIdx
            ? { ...newTab, active: true }
            : isSameTab(t, newTab)
            ? null
            : { ...t, active: false }
        )
        .filter((t): t is Tab => t !== null);
      set({ tabs: nextTabs, currentTab: newTab });
    }
  },
  openNew: (tab) => {
    const { tabs } = get();
    const nextTabs = tabs
      .filter((t) => !isSameTab(t, tab))
      .map((t) => ({ ...t, active: false }))
      .concat([{ ...tab, active: true }]);
    set({ tabs: nextTabs, currentTab: tab });
  },
  select: (tab) => {
    const { tabs } = get();
    const nextTabs = tabs.map((t) => ({ ...t, active: isSameTab(t, tab) }));
    set({ tabs: nextTabs, currentTab: tab });
  },
  close: (tab) => {
    const { tabs } = get();
    const remainingTabs = tabs.filter((t) => !isSameTab(t, tab));

    if (remainingTabs.length === 0) {
      return set({ tabs: [], currentTab: null });
    }

    const closedTabIndex = tabs.findIndex((t) => isSameTab(t, tab));
    const nextActiveIndex = closedTabIndex < remainingTabs.length
      ? closedTabIndex
      : remainingTabs.length - 1;

    const nextTabs = remainingTabs.map((t, idx) => ({ ...t, active: idx === nextActiveIndex }));
    set({ tabs: nextTabs, currentTab: nextTabs[nextActiveIndex] });
  },
  reorder: (tabs) => {
    const currentTab = tabs.find((t) => t.active) || null;
    set({ tabs, currentTab });
  },
}));

const baseTabSchema = z.object({
  active: z.boolean(),
});

export const tabSchema = z.discriminatedUnion("type", [
  baseTabSchema.extend({
    type: z.literal("sessions" satisfies typeof TABLES[number]),
    id: z.string(),
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
    type: z.literal("calendars" satisfies typeof TABLES[number]),
    month: z.coerce.date(),
  }),
  baseTabSchema.extend({
    type: z.literal("folders" satisfies typeof TABLES[number]),
    id: z.string().nullable(),
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
    case "folders":
      return `folders-${tab.id ?? "all"}`;
  }
};

export const isSameTab = (a: Tab, b: Tab) => {
  return uniqueIdfromTab(a) === uniqueIdfromTab(b);
};
