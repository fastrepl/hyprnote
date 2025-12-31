import type { Store as MainStore } from "../../../../store/tinybase/store/main";
import type { SeedDefinition } from "../shared";

export const emptySeed: SeedDefinition = {
  id: "empty",
  label: "Empty",
  calendarFixtureBase: "default",
  run: async (store: MainStore) => {
    await new Promise((r) => setTimeout(r, 0));
    store.transaction(() => {
      store.delTables();
    });
  },
};
