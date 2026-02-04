import { useEffect, useRef } from "react";

import { getCurrentWebviewWindowLabel } from "@hypr/plugin-windows";

import * as main from "../../tinybase/store/main";
import { useTabs } from "./index";
import { loadPinnedTabs, savePinnedTabs } from "./pinned-persistence";
import { getDefaultState, type Tab, uniqueIdfromTab } from "./schema";

const getPinnedTabIds = (tabs: Tab[]): string[] => {
  return tabs
    .filter((t) => t.pinned)
    .map(uniqueIdfromTab)
    .sort();
};

export const usePinnedTabsSync = () => {
  const store = main.UI.useStore(main.STORE_ID) as main.Store | undefined;
  const pinnedTabsValue = main.UI.useValue("pinned_tabs", store);
  const prevPinnedIdsRef = useRef<string[]>([]);
  const hasInitializedRef = useRef(false);
  const { openNew, pin } = useTabs();

  // Initialize FROM TinyBase when value first appears
  useEffect(() => {
    if (!store || hasInitializedRef.current) return;

    // Wait for the persisted value to be loaded (non-empty string)
    if (typeof pinnedTabsValue !== "string" || pinnedTabsValue === "[]") {
      return;
    }

    hasInitializedRef.current = true;
    const pinnedTabs = loadPinnedTabs(store);

    for (const pinnedTab of pinnedTabs) {
      const { pinned, ...tabInput } = pinnedTab;
      openNew(tabInput);

      const tabs = useTabs.getState().tabs;
      const newTab = tabs.find((t) => {
        const tabWithDefaults = getDefaultState(tabInput);
        return uniqueIdfromTab(t) === uniqueIdfromTab(tabWithDefaults as Tab);
      });

      if (newTab && !newTab.pinned) {
        pin(newTab);
      }
    }

    prevPinnedIdsRef.current = getPinnedTabIds(useTabs.getState().tabs);
  }, [store, pinnedTabsValue, openNew, pin]);

  // Mark as initialized if no pinned tabs to restore (empty or default value)
  useEffect(() => {
    if (!store || hasInitializedRef.current) return;

    // If we have a store but the value is empty/default, mark as initialized
    // This handles the case where there are no pinned tabs to restore
    if (pinnedTabsValue === "[]" || pinnedTabsValue === "") {
      hasInitializedRef.current = true;
    }
  }, [store, pinnedTabsValue]);

  // Sync TO TinyBase when Zustand changes
  useEffect(() => {
    if (!store) return;

    const unsubscribe = useTabs.subscribe((state) => {
      const tabs = state.tabs;
      const pinnedIds = getPinnedTabIds(tabs);
      const prevPinnedIds = prevPinnedIdsRef.current;

      const pinnedChanged =
        prevPinnedIds.length !== pinnedIds.length ||
        prevPinnedIds.some((id, i) => id !== pinnedIds[i]);

      if (pinnedChanged) {
        if (getCurrentWebviewWindowLabel() === "main") {
          savePinnedTabs(store, tabs);
        }
        prevPinnedIdsRef.current = pinnedIds;
      }
    });

    return unsubscribe;
  }, [store]);
};
