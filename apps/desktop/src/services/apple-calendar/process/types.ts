import type { ExistingEvent, IncomingEvent } from "../fetch/types";

export type SyncInput = {
  incoming: Array<IncomingEvent>;
  existing: Array<ExistingEvent>;
};

export type SyncOutput = {
  toDelete: string[];
  toUpdate: Array<ExistingEvent>;
  toAdd: Array<IncomingEvent>;
};
