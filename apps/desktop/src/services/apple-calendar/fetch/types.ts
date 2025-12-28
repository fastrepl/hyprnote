import { EventStorage } from "@hypr/store";

export type IncomingEvent = {
  tracking_id_event: string;
  tracking_id_calendar: string;
  title?: string;
  started_at?: string;
  ended_at?: string;
  location?: string;
  meeting_link?: string;
  description?: string;
  participants?: string;
};

export type ExistingEvent = {
  id: string;
  tracking_id_event?: string;
} & EventStorage;
