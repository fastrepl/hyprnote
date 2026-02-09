import type { Store } from "../../../store/tinybase/store/main";
import { getSessionEventById } from "../../../utils/session-event";

export { isSessionEmpty } from "../../../store/tinybase/store/sessions";

export function getSessionForEvent(
  store: Store,
  trackingId: string,
): string | undefined {
  let foundSessionId: string | undefined;

  store.forEachRow("sessions", (rowId, _forEachCell) => {
    if (foundSessionId) return;

    const tid = getSessionEventById(store, rowId)?.tracking_id;
    if (tid === trackingId) {
      foundSessionId = rowId;
    }
  });

  return foundSessionId;
}
