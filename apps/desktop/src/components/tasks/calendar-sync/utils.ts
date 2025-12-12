import type { AppleEvent } from "@hypr/plugin-apple-calendar";

type StoreSetRow = {
  setRow: (
    tableId: string,
    rowId: string,
    row: Record<string, unknown>,
  ) => unknown;
};

export function generateCalendarChunks(): Array<{ from: string; to: string }> {
  const now = new Date();
  const day = 24 * 60 * 60 * 1000;

  return [
    {
      from: new Date(now.getTime() - 7 * day).toISOString(),
      to: now.toISOString(),
    },
    {
      from: now.toISOString(),
      to: new Date(now.getTime() + 7 * day).toISOString(),
    },
    {
      from: new Date(now.getTime() + 7 * day).toISOString(),
      to: new Date(now.getTime() + 14 * day).toISOString(),
    },
  ];
}

export function storeEvents(
  store: StoreSetRow,
  events: AppleEvent[],
  calendarMap: Record<string, string>,
  userId: string,
) {
  for (const event of events) {
    const calendarId = calendarMap[event.calendar.id];
    if (!calendarId) continue;

    store.setRow("events", event.event_identifier, {
      user_id: userId,
      created_at: event.creation_date ?? new Date().toISOString(),
      calendar_id: calendarId,
      title: event.title,
      started_at: event.start_date,
      ended_at: event.end_date,
      location: event.location ?? "",
      meeting_link: event.url ?? "",
      description: event.notes ?? "",
      note: "",
    });
  }
}

export function getEnabledAppleCalendarMap(
  calendars: Record<string, Record<string, unknown>>,
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [rowId, data] of Object.entries(calendars)) {
    if (data.provider === "apple" && data.enabled === 1 && data.tracking_id) {
      result[data.tracking_id as string] = rowId;
    }
  }

  return result;
}
