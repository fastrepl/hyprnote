import { faker } from "@faker-js/faker";
import type { Tables } from "tinybase/with-schemas";

import type { Schemas } from "../../store/tinybase/persisted";
import type { Store as PersistedStore } from "../../store/tinybase/persisted";
import type { SeedDefinition } from "./shared";
import { generateMockData } from "./shared";

faker.seed(123);

const V1 = (() => {
  const data = generateMockData({
    organizations: 8,
    humansPerOrg: { min: 5, max: 12 },
    sessionsPerHuman: { min: 2, max: 6 },
    eventsPerHuman: { min: 1, max: 5 },
    calendarsPerUser: 3,
  }) satisfies Tables<Schemas[0]>;

  return data;
})();

export const v1Seed: SeedDefinition = {
  id: "v1",
  label: "Seed V1",
  run: (store: PersistedStore) => {
    store.delTables();
    store.setTables(V1);
  },
};
