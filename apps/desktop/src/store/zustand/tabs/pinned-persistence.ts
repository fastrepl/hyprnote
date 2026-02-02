import type { Store } from "../../tinybase/store/main";
import {
  getDefaultState,
  type Tab,
  type TabInput,
  uniqueIdfromTab,
} from "./schema";

export type PinnedTab = TabInput & { pinned: true };

const serializePinnedTabs = (tabs: Tab[]): string => {
  const pinnedTabs = tabs
    .filter((t) => t.pinned)
    .map((tab): PinnedTab => {
      const { active, slotId, pinned, ...rest } = tab as Tab & {
        active: boolean;
        slotId: string;
        pinned: boolean;
      };
      return { ...rest, pinned: true } as PinnedTab;
    });
  return JSON.stringify(pinnedTabs);
};

const deserializePinnedTabs = (data: string): PinnedTab[] => {
  try {
    return JSON.parse(data) as PinnedTab[];
  } catch {
    return [];
  }
};

export const savePinnedTabs = (store: Store, tabs: Tab[]): void => {
  const serialized = serializePinnedTabs(tabs);
  store.setValue("pinned_tabs", serialized);
};

export const loadPinnedTabs = (store: Store): PinnedTab[] => {
  const data = store.getValue("pinned_tabs");
  if (typeof data === "string") {
    return deserializePinnedTabs(data);
  }
  return [];
};

export const restorePinnedTabsToStore = (
  store: Store,
  openNew: (tab: TabInput) => void,
  pin: (tab: Tab) => void,
  getTabs: () => Tab[],
): void => {
  const pinnedTabs = loadPinnedTabs(store);

  for (const pinnedTab of pinnedTabs) {
    const { pinned, ...tabInput } = pinnedTab;
    openNew(tabInput);

    const tabs = getTabs();
    const newTab = tabs.find((t) => {
      const tabWithDefaults = getDefaultState(tabInput);
      return uniqueIdfromTab(t) === uniqueIdfromTab(tabWithDefaults as Tab);
    });

    if (newTab && !newTab.pinned) {
      pin(newTab);
    }
  }
};
