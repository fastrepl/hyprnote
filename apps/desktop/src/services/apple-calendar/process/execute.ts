import type { EventStorage } from "@hypr/store";

import type { Store } from "../../../store/tinybase/main";
import { id } from "../../../utils";
import type { SyncOutput } from "./types";

export function execute(store: Store, syncOutput: SyncOutput): void {
  const userId = store.getValue("user_id");
  if (!userId) {
    throw new Error("user_id is not set");
  }

  const now = new Date().toISOString();

  store.transaction(() => {
    for (const eventId of syncOutput.toDelete) {
      store.delRow("events", eventId);
    }

    for (const existingEvent of syncOutput.toUpdate) {
      store.setPartialRow("events", existingEvent.id, existingEvent);
    }

    for (const incomingEvent of syncOutput.toAdd) {
      store.setRow("events", id(), {
        ...incomingEvent,
        user_id: userId,
        created_at: now,
      } satisfies EventStorage);
    }
  });
}
