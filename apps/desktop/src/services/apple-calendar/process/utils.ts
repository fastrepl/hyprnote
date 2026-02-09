import type { Store } from "../../../store/tinybase/store/main";
import { getSessionEventTrackingId } from "../../../utils/session-event";

export { isSessionEmpty } from "../../../store/tinybase/store/sessions";

export function getSessionForEvent(
  store: Store,
  trackingId: string,
): string | undefined {
  let foundSessionId: string | undefined;

  store.forEachRow("sessions", (rowId, _forEachCell) => {
    if (foundSessionId) return;

    const event = store.getCell("sessions", rowId, "event");
    const tid = getSessionEventTrackingId(event as string | undefined);
    if (tid === trackingId) {
      foundSessionId = rowId;
    }
  });

  return foundSessionId;
}
