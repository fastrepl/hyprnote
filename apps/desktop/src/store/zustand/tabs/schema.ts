import type {
  AiState,
  AiTab,
  ChangelogState,
  ChatShortcutsState,
  ContactsState,
  DataState,
  DataTab,
  EditorView,
  ExtensionsState,
  PromptsState,
  SessionsState,
  TabInput,
  TemplatesState,
} from "@hypr/plugin-windows";

export type {
  AiState,
  AiTab,
  ChangelogState,
  ChatShortcutsState,
  ContactsState,
  DataState,
  DataTab,
  EditorView,
  ExtensionsState,
  PromptsState,
  SessionsState,
  TabInput,
  TemplatesState,
};

export const isEnhancedView = (
  view: EditorView,
): view is { type: "enhanced"; id: string } => view.type === "enhanced";
export const isRawView = (view: EditorView): view is { type: "raw" } =>
  view.type === "raw";
export const isTranscriptView = (
  view: EditorView,
): view is { type: "transcript" } => view.type === "transcript";

type BaseTab = {
  active: boolean;
  slotId: string;
};

export type Tab =
  | (BaseTab & {
      type: "sessions";
      id: string;
      state: SessionsState;
    })
  | (BaseTab & {
      type: "contacts";
      state: ContactsState;
    })
  | (BaseTab & {
      type: "templates";
      state: TemplatesState;
    })
  | (BaseTab & {
      type: "prompts";
      state: PromptsState;
    })
  | (BaseTab & {
      type: "chat_shortcuts";
      state: ChatShortcutsState;
    })
  | (BaseTab & {
      type: "extensions";
      state: ExtensionsState;
    })
  | (BaseTab & { type: "events"; id: string })
  | (BaseTab & { type: "humans"; id: string })
  | (BaseTab & { type: "organizations"; id: string })
  | (BaseTab & { type: "folders"; id: string | null })
  | (BaseTab & { type: "empty" })
  | (BaseTab & {
      type: "extension";
      extensionId: string;
      state: Record<string, unknown>;
    })
  | (BaseTab & { type: "calendar" })
  | (BaseTab & {
      type: "changelog";
      state: ChangelogState;
    })
  | (BaseTab & { type: "settings" })
  | (BaseTab & {
      type: "ai";
      state: AiState;
    })
  | (BaseTab & {
      type: "data";
      state: DataState;
    });

export const getDefaultState = (tab: TabInput): Tab => {
  const base = { active: false, slotId: "" };

  switch (tab.type) {
    case "sessions":
      return {
        ...base,
        type: "sessions",
        id: tab.id,
        state: tab.state ?? { editor: null },
      };
    case "contacts":
      return {
        ...base,
        type: "contacts",
        state: tab.state ?? {
          selectedOrganization: null,
          selectedPerson: null,
        },
      };
    case "templates":
      return {
        ...base,
        type: "templates",
        state: tab.state ?? {
          isWebMode: null,
          selectedMineId: null,
          selectedWebIndex: null,
        },
      };
    case "prompts":
      return {
        ...base,
        type: "prompts",
        state: tab.state ?? {
          selectedTask: null,
        },
      };
    case "chat_shortcuts":
      return {
        ...base,
        type: "chat_shortcuts",
        state: tab.state ?? {
          isWebMode: null,
          selectedMineId: null,
          selectedWebIndex: null,
        },
      };
    case "extensions":
      return {
        ...base,
        type: "extensions",
        state: tab.state ?? {
          selectedExtension: null,
        },
      };
    case "events":
      return { ...base, type: "events", id: tab.id };
    case "humans":
      return { ...base, type: "humans", id: tab.id };
    case "organizations":
      return { ...base, type: "organizations", id: tab.id };
    case "folders":
      return { ...base, type: "folders", id: tab.id };
    case "empty":
      return { ...base, type: "empty" };
    case "extension":
      return {
        ...base,
        type: "extension",
        extensionId: tab.extensionId,
        state: tab.state ?? {},
      };
    case "calendar":
      return { ...base, type: "calendar" };
    case "changelog":
      return {
        ...base,
        type: "changelog",
        state: tab.state,
      };
    case "settings":
      return { ...base, type: "settings" };
    case "ai":
      return {
        ...base,
        type: "ai",
        state: tab.state ?? { tab: null },
      };
    case "data":
      return {
        ...base,
        type: "data",
        state: tab.state ?? { tab: null },
      };
  }
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
    case "contacts":
    case "templates":
    case "prompts":
    case "chat_shortcuts":
    case "extensions":
    case "empty":
    case "extension":
    case "calendar":
    case "changelog":
    case "settings":
    case "ai":
    case "data":
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
    case "calendar":
      return `calendar`;
    case "changelog":
      return "changelog";
    case "settings":
      return `settings`;
    case "ai":
      return `ai`;
    case "data":
      return `data`;
  }
};

export const isSameTab = (a: Tab, b: Tab) => {
  return uniqueIdfromTab(a) === uniqueIdfromTab(b);
};
