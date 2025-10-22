import { describe, expect, test } from "vitest";

import { createContactsTab, createSessionTab } from "./test-utils";
import { computeHistoryFlags, getSlotId, pushHistory, updateHistoryCurrent } from "./utils";

describe("tabs utils", () => {
  test("getSlotId returns unique identifier per tab", () => {
    const tab1 = createSessionTab({ id: "session-1" });
    const tab2 = createSessionTab({ id: "session-2" });
    const contacts = createContactsTab();

    expect(getSlotId(tab1)).toBe("sessions-session-1");
    expect(getSlotId(tab2)).toBe("sessions-session-2");
    expect(getSlotId(contacts)).toBe("contacts");
  });

  test("pushHistory appends to tab's own history slot", () => {
    const tab1 = createSessionTab({ id: "session-1" });
    const tab2 = createSessionTab({ id: "session-2" });

    const history1 = pushHistory(new Map(), tab1);
    const history2 = pushHistory(history1, tab2);

    const slot1 = getSlotId(tab1);
    const slot2 = getSlotId(tab2);

    expect(history1.get(slot1)?.stack).toHaveLength(1);
    expect(history2.get(slot1)?.stack).toHaveLength(1);
    expect(history2.get(slot2)?.stack).toHaveLength(1);
  });

  test("pushHistory truncates forward entries when navigating", () => {
    const tab = createSessionTab({ id: "session-1" });
    const slotId = getSlotId(tab);

    let history = pushHistory(new Map(), tab);
    history = pushHistory(history, { ...tab, state: { editor: "enhanced" } });

    const backTracked = new Map(history);
    backTracked.set(slotId, {
      stack: history.get(slotId)?.stack ?? [],
      currentIndex: 0,
    });

    const branched = pushHistory(backTracked, { ...tab, state: { editor: "transcript" } });
    expect(branched.get(slotId)?.stack).toHaveLength(2);
  });

  test("updateHistoryCurrent replaces current stack entry", () => {
    const tab = createContactsTab();
    const history = pushHistory(new Map(), tab);

    const updated = updateHistoryCurrent(history, {
      ...tab,
      state: { selectedOrganization: "org", selectedPerson: null },
    });

    const slotId = getSlotId(tab);
    const updatedStack = updated.get(slotId)?.stack ?? [];
    expect(updatedStack[updatedStack.length - 1]).toMatchObject({
      state: { selectedOrganization: "org", selectedPerson: null },
    });
  });

  test("computeHistoryFlags reflect navigation availability per tab", () => {
    const tab = createSessionTab({ id: "session-1" });
    let history = pushHistory(new Map(), tab);

    expect(computeHistoryFlags(history, tab)).toEqual({ canGoBack: false, canGoNext: false });

    history = pushHistory(history, { ...tab, state: { editor: "enhanced" } });
    expect(computeHistoryFlags(history, tab)).toEqual({ canGoBack: true, canGoNext: false });

    const slotId = getSlotId(tab);
    const backtracked = new Map(history);
    backtracked.set(slotId, {
      stack: history.get(slotId)?.stack ?? [],
      currentIndex: 0,
    });

    expect(computeHistoryFlags(backtracked, tab)).toEqual({ canGoBack: false, canGoNext: true });
  });
});
