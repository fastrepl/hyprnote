import type { Store as MainStore } from "../../../../store/tinybase/store/main";
import curatedData from "../data/curated.json";
import { CuratedDataSchema, loadCuratedData } from "../data/loader";
import type { SeedDefinition } from "../shared";

export const curatedSeed: SeedDefinition = {
  id: "curated",
  label: "Curated",
  calendarFixtureBase: "default",
  run: async (store: MainStore) => {
    const validated = CuratedDataSchema.parse(curatedData);
    const tables = loadCuratedData(validated);
    await new Promise((r) => setTimeout(r, 0));
    store.transaction(() => {
      store.delTables();
      store.setTables(tables);
    });
  },
};
