import { type Store as MemoryStore } from "../tinybase/store/memory";
import { type Store as PersistedStore } from "../tinybase/store/persisted";

export type Context = {
  persistedStore: PersistedStore;
  memoryStore: MemoryStore;
};
