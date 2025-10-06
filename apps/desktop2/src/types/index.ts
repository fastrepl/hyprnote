import z from "zod";

import { type Store as InternalStore } from "../tinybase/store/internal";
import { type Store as MemoryStore } from "../tinybase/store/memory";
import { type Store as PersistedStore } from "../tinybase/store/persisted";

import type { OngoingSessionStore2 } from "@hypr/utils/stores";

export type Context = {
  persistedStore: PersistedStore;
  memoryStore: MemoryStore;
  internalStore: InternalStore;
  ongoingSessionStore: OngoingSessionStore2;
};

export const tabSchema = z.union([
  z.object({ id: z.string(), type: z.literal("note"), active: z.boolean() }),
]);

export type Tab = z.infer<typeof tabSchema>;
