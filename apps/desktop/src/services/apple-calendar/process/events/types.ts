import type { ExistingEvent, IncomingEvent } from "../../fetch/types";

export type EventId = string;
export type SessionId = string;

export type EventsSyncInput = {
  incoming: IncomingEvent[];
  existing: ExistingEvent[];
};

export type EventToUpdate = ExistingEvent &
  Omit<IncomingEvent, "tracking_id_calendar">;

export type EventsSyncOutput = {
  toDelete: EventId[];
  toDeleteSessions: SessionId[];
  toUpdate: EventToUpdate[];
  toAdd: IncomingEvent[];
};
