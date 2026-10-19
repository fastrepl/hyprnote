import { beforeEach, describe, expect, test } from "vitest";

import { leaveAllOverlayTabs } from "./leave-overlay-tab";

import { useTabs } from "~/store/zustand/tabs";
import {
  createSessionTab,
  resetTabsStore,
} from "~/store/zustand/tabs/test-utils";

describe("folder chip navigation from overlays", () => {
  beforeEach(() => {
    resetTabsStore();
  });

  test("nested overlay (Settings -> Contacts) lands on the home tab", () => {
    const session = createSessionTab({ id: "home" });
    useTabs.getState().openNew(session);
    useTabs.getState().openNew({ type: "settings" });
    useTabs.getState().openNew({ type: "contacts" });
    expect(useTabs.getState().currentTab?.type).toBe("contacts");

    leaveAllOverlayTabs();

    expect(useTabs.getState().currentTab?.type).toBe("sessions");
  });

  test("single overlay (Settings) lands on the home tab", () => {
    const session = createSessionTab({ id: "home" });
    useTabs.getState().openNew(session);
    useTabs.getState().openNew({ type: "settings" });

    leaveAllOverlayTabs();

    expect(useTabs.getState().currentTab?.type).toBe("sessions");
  });

  test("orphaned Settings (no return origin) still reaches the home tab", () => {
    useTabs.getState().openNew({ type: "settings" });
    useTabs.getState().openNew({ type: "contacts" });
    expect(useTabs.getState().currentTab?.type).toBe("contacts");

    leaveAllOverlayTabs();

    expect(useTabs.getState().currentTab?.type).toBe("empty");
  });
});
