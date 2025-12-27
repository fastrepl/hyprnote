import type { Store as MainStore } from "../../../../store/tinybase/main";
import curatedData from "../data/curated.json";
import { CuratedDataSchema, loadCuratedData } from "../data/loader";
import type { SeedDefinition } from "../shared";

export const curatedSeed: SeedDefinition = {
  id: "curated",
  label: "Curated",
  run: (store: MainStore) => {
    const validated = CuratedDataSchema.parse(curatedData);
    const tables = loadCuratedData(validated);
    store.transaction(() => {
      store.delTables();
      store.setTables(tables);
    });
  },
};
