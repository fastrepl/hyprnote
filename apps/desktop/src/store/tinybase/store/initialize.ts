import { useEffect } from "react";

import { DEFAULT_USER_ID } from "../../../utils";
import type { Store } from "./main";

export function useInitializeStore(store: Store): void {
  useEffect(() => {
    if (!store) {
      return;
    }

    initializeStore(store);
  }, [store]);
}
function initializeStore(store: Store): void {
  store.transaction(() => {
    if (!store.hasValue("user_id")) {
      store.setValue("user_id", DEFAULT_USER_ID);
    }

    const userId = store.getValue("user_id") as string;
    if (!store.hasRow("humans", userId)) {
      store.setRow("humans", userId, {
        user_id: userId,
        created_at: new Date().toISOString(),
      });
    }

    if (
      !store.getTableIds().includes("sessions") ||
      store.getRowIds("sessions").length === 0
    ) {
      const sessionId = crypto.randomUUID();
      const now = new Date().toISOString();

      store.setRow("sessions", sessionId, {
        user_id: DEFAULT_USER_ID,
        created_at: now,
        title: "Welcome to Hyprnote",
        raw_md: "",
      });
    }
  });
}
