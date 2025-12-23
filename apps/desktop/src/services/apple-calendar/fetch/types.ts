import { EventStorage } from "@hypr/store";

type EventBaseForSync = { id: string };

export type IncomingEvent = EventBaseForSync &
  Omit<EventStorage, "user_id" | "created_at">;

export type ExistingEvent = EventBaseForSync & EventStorage;
