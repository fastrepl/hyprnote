import type { Store as PersistedStore } from "../../store/tinybase/persisted";

import { emptySeed } from "./empty";
import type { SeedDefinition } from "./shared";
import { v1Seed } from "./v1";

export { type SeedDefinition } from "./shared";

export const seeds: SeedDefinition[] = [emptySeed, v1Seed];

export function autoSeedIfEmpty(store?: PersistedStore | null) {
  if (!import.meta.env.DEV || !store) {
    return;
  }

  const isEmpty = Object.keys(store.getTableIds()).every(
    (tableId) => Object.keys(store.getTable(tableId as any)).length === 0,
  );

  if (isEmpty) {
    v1Seed.run(store);
  }
}
