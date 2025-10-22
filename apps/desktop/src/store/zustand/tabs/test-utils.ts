import { id } from "../../../utils";
import { type Tab, useTabs } from ".";
import type { TabHistory } from "./schema";
import { ACTIVE_TAB_SLOT_ID } from "./utils";

type SessionTab = Extract<Tab, { type: "sessions" }>;
type ContactsTab = Extract<Tab, { type: "contacts" }>;

type SessionOverrides = Partial<Omit<SessionTab, "type" | "state">> & {
  state?: Partial<SessionTab["state"]>;
};

type ContactsOverrides = Partial<Omit<ContactsTab, "type" | "state">> & {
  state?: Partial<ContactsTab["state"]>;
};

export const createSessionTab = (overrides: SessionOverrides = {}): SessionTab => ({
  type: "sessions",
  id: overrides.id ?? id(),
  active: overrides.active ?? false,
  state: {
    editor: "raw",
    ...overrides.state,
  },
});

export const createContactsTab = (overrides: ContactsOverrides = {}): ContactsTab => ({
  type: "contacts",
  active: overrides.active ?? false,
  state: {
    selectedOrganization: null,
    selectedPerson: null,
    ...overrides.state,
  },
});

type TabsStore = ReturnType<typeof useTabs.getState>;
type TabsStateSlice = Pick<
  TabsStore,
  | "currentTab"
  | "tabs"
  | "history"
  | "canGoBack"
  | "canGoNext"
  | "onClose"
  | "onEmpty"
>;

const createDefaultTabsState = (): TabsStateSlice => ({
  currentTab: null,
  tabs: [],
  history: new Map(),
  canGoBack: false,
  canGoNext: false,
  onClose: null,
  onEmpty: null,
});

export const seedTabsStore = (overrides: Partial<TabsStateSlice> = {}): void => {
  const state = { ...createDefaultTabsState(), ...overrides };
  useTabs.setState(() => state);
};

export const resetTabsStore = (): void => {
  seedTabsStore();
};

type HistoryEntry = {
  slotId?: string;
  stack: Tab[];
  currentIndex?: number;
};

export const createHistory = (entries: HistoryEntry[]): Map<string, TabHistory> => {
  const history = new Map<string, TabHistory>();

  entries.forEach(({ slotId, stack, currentIndex }) => {
    history.set(slotId ?? ACTIVE_TAB_SLOT_ID, {
      stack,
      currentIndex: currentIndex ?? stack.length - 1,
    });
  });

  return history;
};
