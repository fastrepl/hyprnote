import { type Store as InternalStore } from "../store/tinybase/internal";
import { type Store as PersistedStore } from "../store/tinybase/persisted";

import type { OngoingSessionStore2 } from "@hypr/utils/stores";

export type Context = {
  persistedStore: PersistedStore;
  internalStore: InternalStore;
  ongoingSessionStore: OngoingSessionStore2;
};
