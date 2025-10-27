import type { SeedDefinition } from "./shared";
import { emptySeed, v1Seed, v2Seed } from "./versions";

export { type SeedDefinition } from "./shared";

export const seeds: SeedDefinition[] = [emptySeed, v1Seed, v2Seed];
