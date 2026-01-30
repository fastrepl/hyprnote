import { EventStorage } from "@hypr/store";

export type EventParticipant = {
  name?: string;
  email?: string;
  is_organizer?: boolean;
  is_current_user?: boolean;
};

export type IncomingEvent = {
  id: string;
  tracking_id_event: string;
  tracking_id_calendar: string;
  title?: string;
  started_at?: string;
  ended_at?: string;
  location?: string;
  meeting_link?: string;
  description?: string;
  recurrence_series_id?: string;
};

export type IncomingParticipants = Map<string, EventParticipant[]>;

export type ExistingEvent = {
  id: string;
  tracking_id_event?: string;
} & EventStorage;
