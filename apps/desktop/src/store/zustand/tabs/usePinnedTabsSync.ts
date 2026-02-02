import { useEffect, useRef } from "react";

import { getCurrentWebviewWindowLabel } from "@hypr/plugin-windows";

import * as main from "../../tinybase/store/main";
import { useTabs } from "./index";
import { savePinnedTabs } from "./pinned-persistence";
import type { Tab } from "./schema";
import { uniqueIdfromTab } from "./schema";

const getPinnedTabIds = (tabs: Tab[]): string[] => {
  return tabs
    .filter((t) => t.pinned)
    .map(uniqueIdfromTab)
    .sort();
};

export const usePinnedTabsSync = () => {
  const store = main.UI.useStore(main.STORE_ID) as main.Store | undefined;
  const prevPinnedIdsRef = useRef<string[]>([]);

  useEffect(() => {
    if (!store) return;

    const unsubscribe = useTabs.subscribe((state) => {
      const tabs = state.tabs;
      const pinnedIds = getPinnedTabIds(tabs);
      const prevPinnedIds = prevPinnedIdsRef.current;

      const pinnedChanged =
        prevPinnedIds.length !== pinnedIds.length ||
        prevPinnedIds.some((id, i) => id !== pinnedIds[i]);

      if (pinnedChanged && getCurrentWebviewWindowLabel() === "main") {
        savePinnedTabs(store, tabs);
        prevPinnedIdsRef.current = pinnedIds;
      }
    });

    return unsubscribe;
  }, [store]);
};
