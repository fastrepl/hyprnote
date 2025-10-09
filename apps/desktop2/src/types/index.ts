import z from "zod";

import { type Store as InternalStore } from "../tinybase/store/internal";
import { type Store as MemoryStore } from "../tinybase/store/memory";
import { type Store as PersistedStore, TABLES } from "../tinybase/store/persisted";

import type { OngoingSessionStore2 } from "@hypr/utils/stores";

export type Context = {
  persistedStore: PersistedStore;
  memoryStore: MemoryStore;
  internalStore: InternalStore;
  ongoingSessionStore: OngoingSessionStore2;
};

export const tabSchema = z.union([
  z.object({
    type: z.literal("sessions" satisfies typeof TABLES[number]),
    active: z.boolean(),
    id: z.string(),
  }),
  z.object({
    type: z.literal("events" satisfies typeof TABLES[number]),
    active: z.boolean(),
    id: z.string(),
  }),
  z.object({
    type: z.literal("humans" satisfies typeof TABLES[number]),
    active: z.boolean(),
    id: z.string(),
  }),
  z.object({
    type: z.literal("organizations" satisfies typeof TABLES[number]),
    active: z.boolean(),
    id: z.string(),
  }),
  z.object({
    type: z.literal("calendars" satisfies typeof TABLES[number]),
    active: z.boolean(),
    month: z.coerce.date(),
  }),
]);

export type Tab = z.infer<typeof tabSchema>;

export const rowIdfromTab = (tab: Tab): string => {
  switch (tab.type) {
    case "sessions":
      return tab.id;
    case "events":
      return tab.id;
    case "humans":
      return tab.id;
    case "organizations":
      return tab.id;
    case "calendars":
      throw new Error("invalid_resource");
  }
};

export const uniqueIdfromTab = (tab: Tab): string => {
  switch (tab.type) {
    case "sessions":
      return `sessions-${tab.id}`;
    case "events":
      return `events-${tab.id}`;
    case "humans":
      return `humans-${tab.id}`;
    case "organizations":
      return `organizations-${tab.id}`;
    case "calendars":
      return `calendars-${tab.month.getFullYear()}-${tab.month.getMonth()}`;
  }
};

export const isSameTab = (a: Tab, b: Tab) => {
  return uniqueIdfromTab(a) === uniqueIdfromTab(b);
};
