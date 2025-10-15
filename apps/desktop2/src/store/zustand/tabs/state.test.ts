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
      const tab = createSessionTab({ id: "s1", active: true });
      useTabs.getState().setTabs([tab]);

      useTabs.getState().updateSessionTabState(tab, { editor: "enhanced" });

      const state = useTabs.getState();
      expect(state.tabs[0]).toMatchObject({ id: "s1", state: { editor: "enhanced" } });
      expect(state).toHaveCurrentTab({ id: "s1", state: { editor: "enhanced" } });
      expect(state).toHaveLastHistoryEntry({ state: { editor: "enhanced" } });
    });

    test("updates only matching tab instances", () => {
      const tab = createSessionTab({ id: "s", active: false });
      const active = createSessionTab({ id: "active", active: true });
      useTabs.getState().setTabs([tab, active]);

      useTabs.getState().updateSessionTabState(tab, { editor: "enhanced" });

      const state = useTabs.getState();
      expect(state.tabs[0]).toMatchObject({ id: "s", state: { editor: "enhanced" } });
      expect(state.tabs[1]).toMatchObject({ id: "active", state: { editor: "raw" } });
      expect(state).toHaveLastHistoryEntry({ id: "active", state: { editor: "raw" } });
    });

    test("no-op when tab types mismatch", () => {
      const session = createSessionTab({ id: "s", active: true });
      const contacts = createContactsTab();
      useTabs.getState().setTabs([session, contacts]);

      useTabs.getState().updateSessionTabState(contacts as Tab, { editor: "enhanced" } as any);

      const state = useTabs.getState();
      expect(state.tabs[0]).toMatchObject({ id: "s", state: { editor: "raw" } });
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
      useTabs.getState().setTabs([contacts]);

      useTabs.getState().updateContactsTabState(contacts, newContactsState);

      const state = useTabs.getState();
      expect(state.tabs[0]).toMatchObject({ state: newContactsState });
      expect(state).toHaveCurrentTab({ state: newContactsState });
      expect(state).toHaveLastHistoryEntry({ state: newContactsState });
    });

    test("only matching contacts tab receives update", () => {
      const contacts = createContactsTab({ active: false });
      const session = createSessionTab({ id: "s", active: true });
      useTabs.getState().setTabs([contacts, session]);

      useTabs.getState().updateContactsTabState(contacts, newContactsState);

      const state = useTabs.getState();
      expect(state.tabs[0]).toMatchObject({ state: newContactsState });
      expect(state.tabs[1]).toMatchObject({ state: { editor: "raw" } });
      expect(state).toHaveLastHistoryEntry({ id: "s" });
    });

    test("updates all contacts tabs sharing identity even when instance differs", () => {
      const contacts = createContactsTab({ active: true });
      const other = createContactsTab({ active: false });
      useTabs.getState().setTabs([contacts, other]);

      const otherInstance = createContactsTab({ active: true });
      useTabs.getState().updateContactsTabState(otherInstance, newContactsState);

      const state = useTabs.getState();
      expect(state.tabs[0]).toMatchObject({ state: newContactsState });
      expect(state.tabs[1]).toMatchObject({ state: newContactsState });
    });
  });
});
