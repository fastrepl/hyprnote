import type { SeedDefinition } from "./shared";
import { curatedSeed, debugSeed, emptySeed, randomSeed } from "./versions";

export { type SeedDefinition } from "./shared";

export const seeds: SeedDefinition[] = [
  emptySeed,
  randomSeed,
  curatedSeed,
  debugSeed,
];
