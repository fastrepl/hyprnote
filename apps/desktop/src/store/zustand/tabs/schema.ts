import { z } from "zod";

import { TABLES } from "../../tinybase/main";

const baseTabSchema = z.object({
  active: z.boolean(),
  slotId: z.string(),
});

export const editorViewSchema = z.enum(["raw", "enhanced", "transcript"]);
export type EditorView = z.infer<typeof editorViewSchema>;

export const tabSchema = z.discriminatedUnion("type", [
  baseTabSchema.extend({
    type: z.literal("sessions" satisfies (typeof TABLES)[number]),
    id: z.string(),
    state: z
      .object({
        editor: editorViewSchema.optional(),
      })
      .default({}),
  }),
  baseTabSchema.extend({
    type: z.literal("contacts"),
    state: z
      .object({
        selectedOrganization: z.string().nullable().default(null),
        selectedPerson: z.string().nullable().default(null),
      })
      .default({
        selectedOrganization: null,
        selectedPerson: null,
      }),
  }),
  baseTabSchema.extend({
    type: z.literal("events" satisfies (typeof TABLES)[number]),
    id: z.string(),
  }),
  baseTabSchema.extend({
    type: z.literal("humans" satisfies (typeof TABLES)[number]),
    id: z.string(),
  }),
  baseTabSchema.extend({
    type: z.literal("organizations" satisfies (typeof TABLES)[number]),
    id: z.string(),
  }),
  baseTabSchema.extend({
    type: z.literal("folders" satisfies (typeof TABLES)[number]),
    id: z.string().nullable(),
  }),

  baseTabSchema.extend({
    type: z.literal("calendars"),
    month: z.coerce.date(),
  }),
  baseTabSchema.extend({
    type: z.literal("empty"),
  }),
]);

export type Tab = z.infer<typeof tabSchema>;

export type TabInput =
  | {
      type: "sessions";
      id: string;
      state?: { editor?: "raw" | "enhanced" | "transcript" };
    }
  | {
      type: "contacts";
      state?: {
        selectedOrganization?: string | null;
        selectedPerson?: string | null;
      };
    }
  | { type: "events"; id: string }
  | { type: "humans"; id: string }
  | { type: "organizations"; id: string }
  | { type: "folders"; id: string | null }
  | { type: "calendars"; month: Date }
  | { type: "empty" };

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
    case "empty":
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
    case "empty":
      return `empty-${tab.slotId}`;
  }
};

export const isSameTab = (a: Tab, b: Tab) => {
  return uniqueIdfromTab(a) === uniqueIdfromTab(b);
};
