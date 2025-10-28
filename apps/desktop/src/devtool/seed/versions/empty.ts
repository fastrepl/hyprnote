import type { Store as PersistedStore } from "../../../store/tinybase/persisted";
import type { SeedDefinition } from "../shared";

export const emptySeed: SeedDefinition = {
  id: "empty",
  label: "Empty",
  run: (store: PersistedStore) => {
    store.delTables();
  },
};
