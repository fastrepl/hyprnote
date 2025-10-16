import { z } from "zod";

import { TABLES } from "../../tinybase/persisted";

const baseTabSchema = z.object({
  active: z.boolean(),
});

export const tabSchema = z.discriminatedUnion("type", [
  baseTabSchema.extend({
    type: z.literal("sessions" satisfies typeof TABLES[number]),
    id: z.string(),
    state: z.object({
      editor: z.enum(["raw", "enhanced", "transcript"]).default("raw"),
    }).default({ editor: "raw" }),
  }),
  baseTabSchema.extend({
    type: z.literal("contacts"),
    state: z.object({
      selectedOrganization: z.string().nullable().default(null),
      selectedPerson: z.string().nullable().default(null),
    }).default({
      selectedOrganization: null,
      selectedPerson: null,
    }),
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
    type: z.literal("folders" satisfies typeof TABLES[number]),
    id: z.string().nullable(),
  }),

  baseTabSchema.extend({
    type: z.literal("calendars"),
    month: z.coerce.date(),
  }),
]);

export type Tab = z.infer<typeof tabSchema>;

export type TabHistory = {
  stack: Tab[];
  currentIndex: number;
};

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
    case "contacts":
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
    case "contacts":
      return `contacts`;
    case "folders":
      return `folders-${tab.id ?? "all"}`;
  }
};

export const isSameTab = (a: Tab, b: Tab) => {
  return uniqueIdfromTab(a) === uniqueIdfromTab(b);
};
