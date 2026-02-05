import type { Store } from "../../../store/tinybase/store/main";

export { isSessionEmpty } from "../../../store/tinybase/store/sessions";

export function getSessionForEvent(
  store: Store,
  eventId: string,
): string | undefined {
  let foundSessionId: string | undefined;

  store.forEachRow("sessions", (rowId, _forEachCell) => {
    if (foundSessionId) return;

    const session = store.getRow("sessions", rowId);
    if (session?.event_id === eventId) {
      foundSessionId = rowId;
    }
  });

  return foundSessionId;
}
