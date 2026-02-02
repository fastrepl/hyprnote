import { useEffect, useRef } from "react";

import { getCurrentWebviewWindowLabel } from "@hypr/plugin-windows";

import * as main from "../../tinybase/store/main";
import { useTabs } from "./index";
import { saveRecentlyOpenedSessions } from "./recently-opened";

export const useRecentlyOpenedSync = () => {
  const store = main.UI.useStore(main.STORE_ID) as main.Store | undefined;
  const prevIdsRef = useRef<string[]>([]);

  useEffect(() => {
    if (!store) return;

    const unsubscribe = useTabs.subscribe((state) => {
      const ids = state.recentlyOpenedSessionIds;
      const prevIds = prevIdsRef.current;

      const idsChanged =
        prevIds.length !== ids.length || prevIds.some((id, i) => id !== ids[i]);

      if (idsChanged && getCurrentWebviewWindowLabel() === "main") {
        saveRecentlyOpenedSessions(store, ids);
        prevIdsRef.current = ids;
      }
    });

    return unsubscribe;
  }, [store]);
};
