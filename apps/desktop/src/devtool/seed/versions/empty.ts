import type { Store as PersistedStore } from "../../../store/tinybase/main";
import type { SeedDefinition } from "../shared";

export const emptySeed: SeedDefinition = {
  id: "empty",
  label: "Empty",
  run: (store: PersistedStore) => {
    store.transaction(() => {
      store.delTables();
    });
  },
};
