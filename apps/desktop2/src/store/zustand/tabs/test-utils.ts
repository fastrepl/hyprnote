import { type Tab, useTabs } from ".";

type SessionTab = Extract<Tab, { type: "sessions" }>;
type ContactsTab = Extract<Tab, { type: "contacts" }>;

let tabCounter = 0;

const nextId = (prefix: string) => `${prefix}-${++tabCounter}`;

type SessionOverrides = Partial<Omit<SessionTab, "type" | "state">> & {
  state?: Partial<SessionTab["state"]>;
};

type ContactsOverrides = Partial<Omit<ContactsTab, "type" | "state">> & {
  state?: Partial<ContactsTab["state"]>;
};

export const createSessionTab = (overrides: SessionOverrides = {}): SessionTab => ({
  type: "sessions",
  id: overrides.id ?? nextId("session"),
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

export const resetTabsStore = (): void => {
  tabCounter = 0;
  useTabs.setState(() => ({
    currentTab: null,
    tabs: [],
    history: new Map(),
    canGoBack: false,
    canGoNext: false,
    onCloseHandlers: new Set(),
  }));
};
