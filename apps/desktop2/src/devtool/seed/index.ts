import { emptySeed } from "./empty";
import type { SeedDefinition } from "./shared";
import { v1Seed } from "./v1";

export { type SeedDefinition } from "./shared";

export const seeds: SeedDefinition[] = [emptySeed, v1Seed];
