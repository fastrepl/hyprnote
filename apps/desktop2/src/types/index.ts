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

const baseTabSchema = z.object({
  active: z.boolean(),
});

export const tabSchema = z.discriminatedUnion("type", [
  baseTabSchema.extend({
    type: z.literal("sessions" satisfies typeof TABLES[number]),
    id: z.string(),
  }),
  baseTabSchema.extend({
    type: z.literal("events" satisfies typeof TABLES[number]),
    id: z.string(),
  }),
  baseTabSchema.extend({
    type: z.literal("humans" satisfies typeof TABLES[number]),
    id: z.string(),
  }),
  baseTabSchema.extend({
    type: z.literal("organizations" satisfies typeof TABLES[number]),
    id: z.string(),
  }),
  baseTabSchema.extend({
    type: z.literal("calendars" satisfies typeof TABLES[number]),
    month: z.coerce.date(),
  }),
  baseTabSchema.extend({
    type: z.literal("folders" satisfies typeof TABLES[number]),
    id: z.string().nullable(),
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
    case "folders":
      if (!tab.id) {
        throw new Error("invalid_resource");
      }
      return tab.id;
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
    case "folders":
      return `folders-${tab.id ?? "all"}`;
  }
};

export const isSameTab = (a: Tab, b: Tab) => {
  return uniqueIdfromTab(a) === uniqueIdfromTab(b);
};
