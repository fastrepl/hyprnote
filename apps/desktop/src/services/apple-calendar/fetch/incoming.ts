import type { AppleEvent, Participant } from "@hypr/plugin-apple-calendar";
import { commands as appleCalendarCommands } from "@hypr/plugin-apple-calendar";
import { commands as miscCommands } from "@hypr/plugin-misc";
import type { EventParticipant } from "@hypr/store";

import type { Ctx } from "../ctx";
import type { IncomingEvent } from "./types";

export async function fetchIncomingEvents(
  ctx: Ctx,
): Promise<Array<IncomingEvent>> {
  const results = await Promise.all(
    Array.from(ctx.calendarIds).map(async (calendarId) => {
      const result = await appleCalendarCommands.listEvents({
        calendar_tracking_id: calendarId,
        from: ctx.from.toISOString(),
        to: ctx.to.toISOString(),
      });

      if (result.status === "error") {
        return [];
      }

      return result.data;
    }),
  );

  const events = results.flat();

  return Promise.all(events.map(normalizeAppleEvent));
}

async function normalizeAppleEvent(event: AppleEvent): Promise<IncomingEvent> {
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
    calendar_id: event.calendar.id,
    title: event.title,
    started_at: event.start_date,
    ended_at: event.end_date,
    location: event.location ?? undefined,
    meeting_link: meetingLink ?? undefined,
    description: event.notes ?? undefined,
    participants:
      participants.length > 0 ? JSON.stringify(participants) : undefined,
  };
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
