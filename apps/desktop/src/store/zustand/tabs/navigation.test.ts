import { beforeEach, describe, expect, test } from "vitest";
import { useTabs } from ".";
import { createSessionTab } from "./test-utils";
import "./test-matchers";

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
    const tab1 = createSessionTab({ active: true });
    const tab2 = createSessionTab({ active: true });

    useTabs.getState().openCurrent(tab1);
    expect(useTabs.getState()).toHaveCurrentTab(tab1);
    expect(useTabs.getState()).toHaveNavigationState({ canGoBack: false, canGoNext: false });

    useTabs.getState().openCurrent(tab2);
    expect(useTabs.getState()).toHaveCurrentTab(tab2);
    expect(useTabs.getState()).toHaveNavigationState({ canGoBack: true, canGoNext: false });

    useTabs.getState().goBack();
    expect(useTabs.getState()).toHaveCurrentTab(tab1);
    expect(useTabs.getState()).toHaveNavigationState({ canGoBack: false, canGoNext: true });

    useTabs.getState().goNext();
    expect(useTabs.getState()).toHaveCurrentTab(tab2);
    expect(useTabs.getState()).toHaveNavigationState({ canGoBack: true, canGoNext: false });
  });

  test("truncate forward history: tab1 -> tab2 -> goBack -> tab3", () => {
    const tab1 = createSessionTab({ active: true });
    const tab2 = createSessionTab({ active: true });
    const tab3 = createSessionTab({ active: true });

    useTabs.getState().openCurrent(tab1);
    useTabs.getState().openCurrent(tab2);
    useTabs.getState().goBack();

    expect(useTabs.getState()).toHaveCurrentTab(tab1);
    expect(useTabs.getState()).toHaveNavigationState({ canGoBack: false, canGoNext: true });

    useTabs.getState().openCurrent(tab3);

    expect(useTabs.getState()).toHaveCurrentTab(tab3);
    expect(useTabs.getState()).toHaveNavigationState({ canGoBack: true, canGoNext: false });
  });

  test("boundary: cannot go back at start", () => {
    const tab1 = createSessionTab({ active: true });

    useTabs.getState().openCurrent(tab1);
    useTabs.getState().goBack();

    expect(useTabs.getState()).toHaveCurrentTab(tab1);
    expect(useTabs.getState()).toHaveNavigationState({ canGoBack: false, canGoNext: false });
  });

  test("boundary: cannot go forward at end", () => {
    const tab1 = createSessionTab({ active: true });
    const tab2 = createSessionTab({ active: true });

    useTabs.getState().openCurrent(tab1);
    useTabs.getState().openCurrent(tab2);
    useTabs.getState().goNext();

    expect(useTabs.getState()).toHaveCurrentTab(tab2);
    expect(useTabs.getState()).toHaveNavigationState({ canGoBack: true, canGoNext: false });
  });

  test("openCurrent with active:false in input should still track history", () => {
    const tab1 = createSessionTab({ active: false });
    const tab2 = createSessionTab({ active: false });

    useTabs.getState().openCurrent(tab1);
    expect(useTabs.getState()).toHaveNavigationState({ canGoBack: false, canGoNext: false });

    useTabs.getState().openCurrent(tab2);
    expect(useTabs.getState()).toHaveNavigationState({ canGoBack: true, canGoNext: false });

    useTabs.getState().goBack();
    expect(useTabs.getState()).toHaveCurrentTab({ id: tab1.id });
    expect(useTabs.getState()).toHaveNavigationState({ canGoBack: false, canGoNext: true });
  });
});
