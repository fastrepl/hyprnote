import { type Store as PersistedStore } from "../tinybase/store/persisted";

export type Context = {
  persistedStore: PersistedStore;
};
