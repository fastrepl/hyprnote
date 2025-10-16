import { beforeEach, describe, expect, test, vi } from "vitest";

import { type Tab, useTabs } from ".";
import { createContactsTab, createSessionTab, resetTabsStore } from "./test-utils";
import "./test-matchers";

const isSessionsTab = (tab: Tab): tab is Extract<Tab, { type: "sessions" }> => tab.type === "sessions";

describe("Basic Tab Actions", () => {
  beforeEach(() => {
    resetTabsStore();
  });

  test("setTabs normalizes input, sets current and history flags", () => {
    const rawTabs = [
      createSessionTab({ active: false }),
      createSessionTab({ active: true, state: { editor: "enhanced" } }),
      createContactsTab({ active: false }),
    ];

    useTabs.getState().setTabs(rawTabs);

    expect(useTabs.getState()).toHaveCurrentTab(rawTabs[1]);
    expect(useTabs.getState()).toMatchTabsInOrder([
      { active: false, type: "sessions" },
      { active: true, type: "sessions" },
      { type: "contacts", active: false },
    ]);
    expect(useTabs.getState()).toHaveHistoryLength(1);
    expect(useTabs.getState()).toHaveNavigationState({ canGoBack: false, canGoNext: false });
  });

  test("openCurrent replaces duplicates of same tab and activates new instance", () => {
    const duplicateA = createSessionTab({ active: false });
    const duplicateB = createSessionTab({ id: duplicateA.id, active: false });
    const other = createSessionTab({ active: false });
    useTabs.getState().setTabs([duplicateA, duplicateB, other]);

    const newActive = createSessionTab({ id: duplicateA.id, active: false });
    useTabs.getState().openCurrent(newActive);

    expect(useTabs.getState()).toMatchTabsInOrder([
      { id: other.id, active: false },
      { id: duplicateA.id, active: true },
    ]);
    expect(useTabs.getState()).toHaveLastHistoryEntry({ id: duplicateA.id });
    expect(useTabs.getState()).toHaveNavigationState({ canGoBack: false, canGoNext: false });
  });

  test("openCurrent closes existing active tab via lifecycle handlers", () => {
    const handler = vi.fn();
    const active = createSessionTab({ id: "first", active: false });
    useTabs.getState().registerOnClose(handler);
    useTabs.getState().openCurrent(active);

    const next = createSessionTab({ id: "second", active: false });
    useTabs.getState().openCurrent(next);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ id: "first" }));
  });

  test("openNew appends unique active tab and closes duplicates", () => {
    const duplicate = createSessionTab({ id: "dup", active: false });
    const handler = vi.fn();
    useTabs.getState().registerOnClose(handler);
    useTabs.getState().setTabs([duplicate]);

    useTabs.getState().openNew(createSessionTab({ id: "dup", active: false }));

    const state = useTabs.getState();
    expect(state).toMatchTabsInOrder([
      { id: "dup", active: true },
    ]);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(state).toHaveHistoryLength(1);
  });

  test("select toggles active flag without changing history", () => {
    const tabA = createSessionTab({ active: true });
    const tabB = createSessionTab({ active: false });
    useTabs.getState().setTabs([tabA, tabB]);

    useTabs.getState().select(tabB);

    const state = useTabs.getState();
    if (!state.currentTab || !isSessionsTab(state.currentTab)) {
      throw new Error("expected current tab to be a sessions tab");
    }
    expect(state.currentTab.id).toBe(tabB.id);
    const target = state.tabs.find((t) => isSessionsTab(t) && t.id === tabB.id);
    expect(target?.active).toBe(true);
    expect(useTabs.getState()).toMatchTabsInOrder([
      { id: tabA.id, active: false },
      { id: tabB.id, active: true },
    ]);
    expect(useTabs.getState()).toHaveHistoryLength(1);
  });

  test("close removes tab, picks fallback active, updates history", () => {
    const active = createSessionTab({ active: true });
    const next = createSessionTab({ active: false });
    useTabs.getState().setTabs([active, next]);

    useTabs.getState().close(active);

    expect(useTabs.getState()).toMatchTabsInOrder([
      { id: next.id, active: true },
    ]);
    expect(useTabs.getState()).toHaveCurrentTab({ id: next.id });
    expect(useTabs.getState().history.size).toBe(0);
    expect(useTabs.getState()).toHaveNavigationState({ canGoBack: false, canGoNext: false });
  });

  test("close last tab empties store", () => {
    const only = createSessionTab({ active: true });
    useTabs.getState().setTabs([only]);

    useTabs.getState().close(only);

    expect(useTabs.getState().tabs).toHaveLength(0);
    expect(useTabs.getState().currentTab).toBeNull();
    expect(useTabs.getState()).toHaveNavigationState({ canGoBack: false, canGoNext: false });
  });

  test("reorder keeps current tab and flags consistent", () => {
    const active = createSessionTab({ active: true });
    const other = createSessionTab({ active: false });
    useTabs.getState().setTabs([active, other]);

    useTabs.getState().reorder([other, { ...active, active: true }]);

    expect(useTabs.getState()).toMatchTabsInOrder([
      { id: other.id, active: false },
      { id: active.id, active: true },
    ]);
    expect(useTabs.getState()).toHaveCurrentTab(active);
    expect(useTabs.getState()).toHaveNavigationState({ canGoBack: false, canGoNext: false });
  });
});
