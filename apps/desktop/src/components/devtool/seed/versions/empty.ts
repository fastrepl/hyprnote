import type { Store as MainStore } from "../../../../store/tinybase/main";
import type { SeedDefinition } from "../shared";

export const emptySeed: SeedDefinition = {
  id: "empty",
  label: "Empty",
  calendarFixtureBase: "default",
  run: (store: MainStore) => {
    store.transaction(() => {
      store.delTables();
    });
  },
};
