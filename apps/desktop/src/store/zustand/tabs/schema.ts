import { z } from "zod";

import { TABLES } from "../../tinybase/main";

const baseTabSchema = z.object({
  active: z.boolean(),
  slotId: z.string(),
});

export const editorViewSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("raw") }),
  z.object({ type: z.literal("transcript") }),
  z.object({
    type: z.literal("enhanced"),
    id: z.string(),
  }),
]);
export type EditorView = z.infer<typeof editorViewSchema>;

export const isEnhancedView = (
  view: EditorView,
): view is { type: "enhanced"; id: string } => view.type === "enhanced";
export const isRawView = (view: EditorView): view is { type: "raw" } =>
  view.type === "raw";
export const isTranscriptView = (
  view: EditorView,
): view is { type: "transcript" } => view.type === "transcript";

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
    type: z.literal("templates"),
    state: z
      .object({
        selectedTemplate: z.string().nullable().default(null),
      })
      .default({
        selectedTemplate: null,
      }),
  }),
  baseTabSchema.extend({
    type: z.literal("prompts"),
    state: z
      .object({
        selectedTask: z.string().nullable().default(null),
      })
      .default({
        selectedTask: null,
      }),
  }),
  baseTabSchema.extend({
    type: z.literal("chat_shortcuts"),
    state: z
      .object({
        selectedChatShortcut: z.string().nullable().default(null),
      })
      .default({
        selectedChatShortcut: null,
      }),
  }),
  baseTabSchema.extend({
    type: z.literal("extensions"),
    state: z
      .object({
        selectedExtension: z.string().nullable().default(null),
      })
      .default({
        selectedExtension: null,
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
    type: z.literal("empty"),
  }),
  baseTabSchema.extend({
    type: z.literal("extension"),
    extensionId: z.string(),
    state: z.record(z.string(), z.unknown()).default({}),
  }),
]);

export type Tab = z.infer<typeof tabSchema>;

export type TabInput =
  | {
      type: "sessions";
      id: string;
      state?: { editor?: EditorView };
    }
  | {
      type: "contacts";
      state?: {
        selectedOrganization?: string | null;
        selectedPerson?: string | null;
      };
    }
  | {
      type: "templates";
      state?: {
        selectedTemplate?: string | null;
      };
    }
  | {
      type: "prompts";
      state?: {
        selectedTask?: string | null;
      };
    }
  | {
      type: "chat_shortcuts";
      state?: {
        selectedChatShortcut?: string | null;
      };
    }
  | {
      type: "extensions";
      state?: {
        selectedExtension?: string | null;
      };
    }
  | { type: "events"; id: string }
  | { type: "humans"; id: string }
  | { type: "organizations"; id: string }
  | { type: "folders"; id: string | null }
  | { type: "empty" }
  | { type: "extension"; extensionId: string; state?: Record<string, unknown> };

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
    case "contacts":
    case "templates":
    case "prompts":
    case "chat_shortcuts":
    case "extensions":
    case "empty":
    case "extension":
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
    case "contacts":
      return `contacts`;
    case "templates":
      return `templates`;
    case "prompts":
      return `prompts`;
    case "chat_shortcuts":
      return `chat_shortcuts`;
    case "extensions":
      return `extensions`;
    case "folders":
      return `folders-${tab.id ?? "all"}`;
    case "empty":
      return `empty-${tab.slotId}`;
    case "extension":
      return `extension-${tab.extensionId}`;
  }
};

export const isSameTab = (a: Tab, b: Tab) => {
  return uniqueIdfromTab(a) === uniqueIdfromTab(b);
};
