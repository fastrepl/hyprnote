import { type Store as InternalStore } from "../store/tinybase/internal";
import { type Store as PersistedStore } from "../store/tinybase/persisted";

import type { ListenerStore } from "../store/zustand/listener";

export type Context = {
  persistedStore: PersistedStore;
  internalStore: InternalStore;
  listenerStore: ListenerStore;
};
