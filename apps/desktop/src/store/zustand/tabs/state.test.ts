import { beforeEach, describe, expect, test } from "vitest";

import { type Tab, useTabs } from ".";
import { createContactsTab, createSessionTab, resetTabsStore } from "./test-utils";
import "./test-matchers";

describe("State Updater Actions", () => {
  beforeEach(() => {
    resetTabsStore();
  });

  describe("updateSessionTabState", () => {
    test("updates matching session tab and current tab state", () => {
      const tab = createSessionTab({ active: true });
      useTabs.getState().openNew(tab);

      useTabs.getState().updateSessionTabState(tab, { editor: "enhanced" });

      const state = useTabs.getState();
      expect(state.tabs[0]).toMatchObject({ id: tab.id, state: { editor: "enhanced" } });
      expect(useTabs.getState()).toHaveCurrentTab({ id: tab.id, state: { editor: "enhanced" } });
      expect(useTabs.getState()).toHaveLastHistoryEntry({ state: { editor: "enhanced" } });
    });

    test("updates only matching tab instances", () => {
      const tab = createSessionTab({ active: false });
      const active = createSessionTab({ active: true });
      useTabs.getState().openNew(tab);
      useTabs.getState().openNew(active);

      useTabs.getState().updateSessionTabState(tab, { editor: "enhanced" });

      const state = useTabs.getState();
      expect(state.tabs[0]).toMatchObject({ id: tab.id, state: { editor: "enhanced" } });
      expect(state.tabs[1]).toMatchObject({ id: active.id, state: { editor: "raw" } });
      expect(useTabs.getState()).toHaveLastHistoryEntry({ id: active.id, state: { editor: "raw" } });
    });

    test("no-op when tab types mismatch", () => {
      const session = createSessionTab({ active: true });
      const contacts = createContactsTab();
      useTabs.getState().openNew(session);
      useTabs.getState().openNew(contacts);

      useTabs.getState().updateSessionTabState(contacts as Tab, { editor: "enhanced" } as any);

      const state = useTabs.getState();
      expect(state.tabs[0]).toMatchObject({ id: session.id, state: { editor: "raw" } });
      expect(state.tabs[1]).toMatchObject({ type: "contacts" });
    });
  });

  describe("updateContactsTabState", () => {
    const newContactsState = {
      selectedOrganization: "org-1",
      selectedPerson: "person-1",
    } as const;

    test("updates contacts tab and current tab state", () => {
      const contacts = createContactsTab({ active: true });
      useTabs.getState().openNew(contacts);

      useTabs.getState().updateContactsTabState(contacts, newContactsState);

      const state = useTabs.getState();
      expect(state.tabs[0]).toMatchObject({ state: newContactsState });
      expect(useTabs.getState()).toHaveCurrentTab({ state: newContactsState });
      expect(useTabs.getState()).toHaveLastHistoryEntry({ state: newContactsState });
    });

    test("only matching contacts tab receives update", () => {
      const contacts = createContactsTab({ active: false });
      const session = createSessionTab({ active: true });
      useTabs.getState().openNew(contacts);
      useTabs.getState().openNew(session);

      useTabs.getState().updateContactsTabState(contacts, newContactsState);

      const state = useTabs.getState();
      expect(state.tabs[0]).toMatchObject({ state: newContactsState });
      expect(state.tabs[1]).toMatchObject({ state: { editor: "raw" } });
      expect(useTabs.getState()).toHaveLastHistoryEntry({ id: session.id });
    });

    test("updates contacts tab state using any contacts instance", () => {
      const contacts = createContactsTab({ active: true });
      useTabs.getState().openNew(contacts);

      const otherInstance = createContactsTab({ active: true });
      useTabs.getState().updateContactsTabState(otherInstance, newContactsState);

      const state = useTabs.getState();
      expect(state.tabs[0]).toMatchObject({ state: newContactsState });
      expect(useTabs.getState()).toHaveCurrentTab({ state: newContactsState });
    });
  });
});
