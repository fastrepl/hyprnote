import { useEffect } from "react";

import { DEFAULT_USER_ID } from "../../../utils";
import type { Store } from "./main";

export function useInitializeStore(
  store: Store,
  sessionPersister: unknown,
): void {
  useEffect(() => {
    if (!store || !sessionPersister) {
      return;
    }

    initializeStore(store);
  }, [store, sessionPersister]);
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
        name: "",
        email: "",
        org_id: "",
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
