import { beforeEach, describe, expect, test, vi } from "vitest";

import { type Tab, useTabs } from ".";
import { createContactsTab, createSessionTab, resetTabsStore } from "./test-utils";

const isSessionsTab = (tab: Tab): tab is Extract<Tab, { type: "sessions" }> => tab.type === "sessions";

const expectTabs = (tabs: Tab[], expected: Array<Partial<Tab>>) => {
  expect(tabs).toHaveLength(expected.length);
  expected.forEach((partial, index) => {
    expect(tabs[index]).toMatchObject(partial);
  });
};

describe("Basic Tab Actions", () => {
  beforeEach(() => {
    resetTabsStore();
  });

  test("setTabs normalizes input, sets current and history flags", () => {
    const rawTabs = [
      createSessionTab({ id: "a", active: false }),
      createSessionTab({ id: "b", active: true, state: { editor: "enhanced" } }),
      createContactsTab({ active: false }),
    ];

    useTabs.getState().setTabs(rawTabs);

    const state = useTabs.getState();
    expect(state.currentTab).toMatchObject({ id: "b", active: true });
    expectTabs(state.tabs, [
      { id: "a", active: false },
      { id: "b", active: true },
      { type: "contacts", active: false },
    ]);
    expect(state.history.get("active-tab-history")?.stack).toHaveLength(1);
    expect(state.canGoBack).toBe(false);
    expect(state.canGoNext).toBe(false);
  });

  test("openCurrent replaces duplicates of same tab and activates new instance", () => {
    const duplicateA = createSessionTab({ id: "target", active: false });
    const duplicateB = createSessionTab({ id: "target", active: false });
    const other = createSessionTab({ id: "other", active: false });
    useTabs.getState().setTabs([duplicateA, duplicateB, other]);

    const newActive = createSessionTab({ id: "target", active: false });
    useTabs.getState().openCurrent(newActive);

    const state = useTabs.getState();
    expectTabs(state.tabs, [
      { id: "other", active: false },
      { id: "target", active: true },
    ]);
    const stack = state.history.get("active-tab-history")?.stack;
    expect(stack && stack[stack.length - 1]).toMatchObject({ id: "target" });
    expect(state.canGoBack).toBe(false);
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
    expectTabs(state.tabs, [
      { id: "dup", active: true },
    ]);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(state.history.get("active-tab-history")?.stack).toHaveLength(1);
  });

  test("select toggles active flag without changing history", () => {
    const tabA = createSessionTab({ id: "a", active: true });
    const tabB = createSessionTab({ id: "b", active: false });
    useTabs.getState().setTabs([tabA, tabB]);

    useTabs.getState().select(tabB);

    const state = useTabs.getState();
    if (!state.currentTab || !isSessionsTab(state.currentTab)) {
      throw new Error("expected current tab to be a sessions tab");
    }
    expect(state.currentTab.id).toBe("b");
    const target = state.tabs.find((t) => isSessionsTab(t) && t.id === "b");
    expect(target?.active).toBe(true);
    expectTabs(state.tabs, [
      { id: "a", active: false },
      { id: "b", active: true },
    ]);
    expect(state.history.get("active-tab-history")?.stack).toHaveLength(1);
  });

  test("close removes tab, picks fallback active, updates history", () => {
    const active = createSessionTab({ id: "active", active: true });
    const next = createSessionTab({ id: "next", active: false });
    useTabs.getState().setTabs([active, next]);

    useTabs.getState().close(active);

    const state = useTabs.getState();
    expectTabs(state.tabs, [
      { id: "next", active: true },
    ]);
    expect(state.currentTab).toMatchObject({ id: "next" });
    expect(state.history.size).toBe(0);
    expect(state.canGoBack).toBe(false);
    expect(state.canGoNext).toBe(false);
  });

  test("close last tab empties store", () => {
    const only = createSessionTab({ id: "only", active: true });
    useTabs.getState().setTabs([only]);

    useTabs.getState().close(only);

    const state = useTabs.getState();
    expect(state.tabs).toHaveLength(0);
    expect(state.currentTab).toBeNull();
    expect(state.canGoBack).toBe(false);
    expect(state.canGoNext).toBe(false);
  });

  test("reorder keeps current tab and flags consistent", () => {
    const active = createSessionTab({ id: "active", active: true });
    const other = createSessionTab({ id: "other", active: false });
    useTabs.getState().setTabs([active, other]);

    useTabs.getState().reorder([other, { ...active, active: true }]);

    const state = useTabs.getState();
    expectTabs(state.tabs, [
      { id: "other", active: false },
      { id: "active", active: true },
    ]);
    expect(state.currentTab).toMatchObject({ id: "active" });
    expect(state.canGoBack).toBe(false);
  });
});
