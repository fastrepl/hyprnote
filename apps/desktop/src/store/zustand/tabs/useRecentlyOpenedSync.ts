import { useEffect, useRef } from "react";

import { getCurrentWebviewWindowLabel } from "@hypr/plugin-windows";

import * as main from "../../tinybase/store/main";
import { useTabs } from "./index";
import {
  loadRecentlyOpenedSessions,
  saveRecentlyOpenedSessions,
} from "./recently-opened";

export const useRecentlyOpenedSync = () => {
  const store = main.UI.useStore(main.STORE_ID) as main.Store | undefined;
  const recentlyOpenedValue = main.UI.useValue(
    "recently_opened_sessions",
    store,
  );
  const prevIdsRef = useRef<string[]>([]);
  const hasInitializedRef = useRef(false);

  // Initialize FROM TinyBase when value first appears
  useEffect(() => {
    if (!store || hasInitializedRef.current) return;

    // Wait for the persisted value to be loaded (non-empty string)
    if (
      typeof recentlyOpenedValue !== "string" ||
      recentlyOpenedValue === "[]"
    ) {
      return;
    }

    hasInitializedRef.current = true;
    const ids = loadRecentlyOpenedSessions(store);

    useTabs.setState({ recentlyOpenedSessionIds: ids });
    prevIdsRef.current = ids;
  }, [store, recentlyOpenedValue]);

  // Mark as initialized if no recently opened sessions to restore
  useEffect(() => {
    if (!store || hasInitializedRef.current) return;

    if (recentlyOpenedValue === "[]" || recentlyOpenedValue === "") {
      hasInitializedRef.current = true;
    }
  }, [store, recentlyOpenedValue]);

  // Sync TO TinyBase when Zustand changes
  useEffect(() => {
    if (!store) return;

    const unsubscribe = useTabs.subscribe((state) => {
      const ids = state.recentlyOpenedSessionIds;
      const prevIds = prevIdsRef.current;

      const idsChanged =
        prevIds.length !== ids.length || prevIds.some((id, i) => id !== ids[i]);

      if (idsChanged) {
        if (getCurrentWebviewWindowLabel() === "main") {
          saveRecentlyOpenedSessions(store, ids);
        }
        prevIdsRef.current = ids;
      }
    });

    return unsubscribe;
  }, [store]);
};
