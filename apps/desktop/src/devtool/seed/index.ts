import type { SeedDefinition } from "./shared";
import { curatedSeed, emptySeed, randomSeed } from "./versions";

export { type SeedDefinition } from "./shared";

export const seeds: SeedDefinition[] = [emptySeed, randomSeed, curatedSeed];
