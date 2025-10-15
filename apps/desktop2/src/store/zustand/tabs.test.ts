import { beforeEach, describe, expect, test, vi } from "vitest";
import { type Tab, useTabs } from "./tabs";

describe("Tab History Navigation", () => {
  beforeEach(() => {
    useTabs.setState({
      currentTab: null,
      tabs: [],
      history: new Map(),
      canGoBack: false,
      canGoNext: false,
    });
  });

  test("basic navigation: open tab1 -> open tab2 -> goBack -> goNext", () => {
    const tab1: Tab = {
      type: "sessions",
      id: "session-1",
      active: true,
      state: { editor: "raw" },
    };
    const tab2: Tab = {
      type: "sessions",
      id: "session-2",
      active: true,
      state: { editor: "raw" },
    };

    useTabs.getState().openCurrent(tab1);
    let state = useTabs.getState();
    expect(state.currentTab).toMatchObject({ id: "session-1" });
    expect(state.canGoBack).toBe(false);
    expect(state.canGoNext).toBe(false);

    useTabs.getState().openCurrent(tab2);
    state = useTabs.getState();
    expect(state.currentTab).toMatchObject({ id: "session-2" });
    expect(state.canGoBack).toBe(true);
    expect(state.canGoNext).toBe(false);

    useTabs.getState().goBack();
    state = useTabs.getState();
    expect(state.currentTab).toMatchObject({ id: "session-1" });
    expect(state.canGoBack).toBe(false);
    expect(state.canGoNext).toBe(true);

    useTabs.getState().goNext();
    state = useTabs.getState();
    expect(state.currentTab).toMatchObject({ id: "session-2" });
    expect(state.canGoBack).toBe(true);
    expect(state.canGoNext).toBe(false);
  });

  test("truncate forward history: tab1 -> tab2 -> goBack -> tab3", () => {
    const tab1: Tab = {
      type: "sessions",
      id: "session-1",
      active: true,
      state: { editor: "raw" },
    };
    const tab2: Tab = {
      type: "sessions",
      id: "session-2",
      active: true,
      state: { editor: "raw" },
    };
    const tab3: Tab = {
      type: "sessions",
      id: "session-3",
      active: true,
      state: { editor: "raw" },
    };

    useTabs.getState().openCurrent(tab1);
    useTabs.getState().openCurrent(tab2);
    useTabs.getState().goBack();

    let state = useTabs.getState();
    expect(state.currentTab).toMatchObject({ id: "session-1" });
    expect(state.canGoNext).toBe(true);

    useTabs.getState().openCurrent(tab3);

    state = useTabs.getState();
    expect(state.currentTab).toMatchObject({ id: "session-3" });
    expect(state.canGoBack).toBe(true);
    expect(state.canGoNext).toBe(false);
  });

  test("boundary: cannot go back at start", () => {
    const tab1: Tab = {
      type: "sessions",
      id: "session-1",
      active: true,
      state: { editor: "raw" },
    };

    useTabs.getState().openCurrent(tab1);
    useTabs.getState().goBack();

    const state = useTabs.getState();
    expect(state.currentTab).toMatchObject({ id: "session-1" });
    expect(state.canGoBack).toBe(false);
  });

  test("boundary: cannot go forward at end", () => {
    const tab1: Tab = {
      type: "sessions",
      id: "session-1",
      active: true,
      state: { editor: "raw" },
    };
    const tab2: Tab = {
      type: "sessions",
      id: "session-2",
      active: true,
      state: { editor: "raw" },
    };

    useTabs.getState().openCurrent(tab1);
    useTabs.getState().openCurrent(tab2);
    useTabs.getState().goNext();

    const state = useTabs.getState();
    expect(state.currentTab).toMatchObject({ id: "session-2" });
    expect(state.canGoNext).toBe(false);
  });

  test("openCurrent with active:false in input should still track history", () => {
    useTabs.getState().openCurrent({
      type: "sessions",
      id: "tab-1",
      active: false,
      state: { editor: "raw" },
    });
    expect(useTabs.getState().canGoBack).toBe(false);

    useTabs.getState().openCurrent({
      type: "sessions",
      id: "tab-2",
      active: false,
      state: { editor: "raw" },
    });
    expect(useTabs.getState().canGoBack).toBe(true);

    useTabs.getState().goBack();
    const state = useTabs.getState();
    expect(state.currentTab).toMatchObject({ id: "tab-1" });
    expect(state.canGoNext).toBe(true);
  });

  test("registerOnClose triggers handler when close removes tab", () => {
    const tab: Tab = {
      type: "sessions",
      id: "session-1",
      active: true,
      state: { editor: "raw" },
    };

    const handler = vi.fn();
    useTabs.getState().openCurrent(tab);
    const unregister = useTabs.getState().registerOnClose(handler);
    useTabs.getState().close(tab);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ id: "session-1", type: "sessions" }));

    unregister();
    expect(useTabs.getState().onCloseHandlers.size).toBe(0);
  });

  test("registerOnClose triggers handler when openCurrent replaces tab", () => {
    const tab1: Tab = {
      type: "sessions",
      id: "session-1",
      active: true,
      state: { editor: "raw" },
    };
    const tab2: Tab = {
      type: "sessions",
      id: "session-2",
      active: true,
      state: { editor: "raw" },
    };

    const handler = vi.fn();
    useTabs.getState().openCurrent(tab1);
    useTabs.getState().registerOnClose(handler);
    useTabs.getState().openCurrent(tab2);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ id: "session-1", type: "sessions" }));
  });

  test("registerOnClose handler receives correct tab when multiple tabs close", () => {
    const tab1: Tab = {
      type: "sessions",
      id: "session-1",
      active: true,
      state: { editor: "raw" },
    };
    const tab2: Tab = {
      type: "sessions",
      id: "session-2",
      active: true,
      state: { editor: "raw" },
    };

    const closedTabs: Tab[] = [];
    const handler = vi.fn((tab: Tab) => closedTabs.push(tab));

    useTabs.getState().registerOnClose(handler);
    useTabs.getState().openCurrent(tab1);
    useTabs.getState().openNew(tab2);
    useTabs.getState().close(tab2);

    expect(closedTabs).toHaveLength(1);
    expect(closedTabs[0]).toMatchObject({ id: "session-2", type: "sessions" });
  });
});
