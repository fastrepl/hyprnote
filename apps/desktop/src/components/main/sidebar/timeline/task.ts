import {
  commands as appleCalendarCommands,
  type AppleEvent,
  type Participant,
} from "@hypr/plugin-apple-calendar";
import { commands as miscCommands } from "@hypr/plugin-misc";
import type { EventParticipant } from "@hypr/store";

import type { Store } from "../../../../store/tinybase/main";

export const CALENDAR_SYNC_TASK_ID = "calendarSync";

export async function syncCalendarEvents(store: Store): Promise<void> {
  const [_, result] = await Promise.all([
    new Promise((resolve) => setTimeout(resolve, 250)),
    doSyncCalendarEvents(store),
  ]);

  return result;
}

async function doSyncCalendarEvents(store: Store): Promise<void> {
  const calendars: { id: string }[] = [];

  store.forEachRow("calendars", (rowId, forEachCell) => {
    let enabled = false;
    let provider = "";

    forEachCell((cellId, cell) => {
      if (cellId === "enabled") enabled = cell === true;
      if (cellId === "provider") provider = String(cell);
    });

    if (enabled && provider === "apple") {
      calendars.push({ id: rowId });
    }
  });

  if (calendars.length === 0) {
    return;
  }

  const userId = store.getValue("user_id");
  if (!userId) {
    return;
  }

  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 7);
  const to = new Date(now);
  to.setDate(to.getDate() + 30);

  const results = await Promise.all(
    calendars.map(async (calendar) => {
      const result = await appleCalendarCommands.listEvents({
        calendar_tracking_id: calendar.id,
        from: from.toISOString(),
        to: to.toISOString(),
      });

      if (result.status === "error") {
        console.error(
          "[CalendarSync] Apple Calendar fetch failed:",
          result.error,
        );
        return [];
      }

      return Promise.all(result.data.map(normalizeEvent));
    }),
  );

  const allEvents = results.flat();

  store.transaction(() => {
    for (const event of allEvents) {
      store.setRow("events", event.id, {
        user_id: userId,
        created_at: new Date().toISOString(),
        calendar_id: event.calendarId,
        title: event.title,
        started_at: event.startedAt,
        ended_at: event.endedAt,
        location: event.location,
        meeting_link: event.meetingLink,
        description: event.description,
        participants: event.participants
          ? JSON.stringify(event.participants)
          : undefined,
      });
    }
  });
}

async function extractMeetingLink(
  ...texts: (string | undefined | null)[]
): Promise<string | undefined> {
  for (const text of texts) {
    if (!text) continue;
    const result = await miscCommands.parseMeetingLink(text);
    if (result) return result;
  }
  return undefined;
}

function normalizeParticipant(
  participant: Participant,
  isOrganizer: boolean,
): EventParticipant {
  return {
    name: participant.name ?? undefined,
    email: participant.email ?? undefined,
    is_organizer: isOrganizer,
    is_current_user: participant.is_current_user,
  };
}

async function normalizeEvent(event: AppleEvent) {
  const meetingLink =
    event.url ?? (await extractMeetingLink(event.notes, event.location));

  const participants: EventParticipant[] = [];

  if (event.organizer) {
    participants.push(normalizeParticipant(event.organizer, true));
  }

  for (const attendee of event.attendees) {
    participants.push(normalizeParticipant(attendee, false));
  }

  return {
    id: event.event_identifier,
    calendarId: event.calendar.id,
    title: event.title,
    startedAt: event.start_date,
    endedAt: event.end_date,
    location: event.location ?? undefined,
    meetingLink: meetingLink ?? undefined,
    description: event.notes ?? undefined,
    participants: participants.length > 0 ? participants : undefined,
  };
}
