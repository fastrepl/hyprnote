import { beforeEach, describe, expect, test } from "vitest";
import { type Tab, useTabs } from ".";

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
});
