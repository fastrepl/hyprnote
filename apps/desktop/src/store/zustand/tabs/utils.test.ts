import { describe, expect, test } from "vitest";

import { createContactsTab, createSessionTab } from "./test-utils";
import { ACTIVE_TAB_SLOT_ID, computeHistoryFlags, getSlotId, pushHistory, updateHistoryCurrent } from "./utils";

describe("tabs utils", () => {
  test("getSlotId distinguishes active tab slot", () => {
    const active = createSessionTab({ active: true });
    const inactive = createSessionTab({ active: false });

    expect(getSlotId(active)).toBe(ACTIVE_TAB_SLOT_ID);
    expect(getSlotId(inactive)).toContain(inactive.id);
  });

  test("pushHistory appends to active slot and resets forward history", () => {
    const first = createSessionTab({ active: true });
    const second = createSessionTab({ active: true });

    const initial = pushHistory(new Map(), first);
    const advanced = pushHistory(initial, second);

    expect(initial.get(ACTIVE_TAB_SLOT_ID)?.stack).toHaveLength(1);
    expect(advanced.get(ACTIVE_TAB_SLOT_ID)?.stack).toHaveLength(2);
    const stack = advanced.get(ACTIVE_TAB_SLOT_ID)?.stack ?? [];
    expect(stack[stack.length - 1]).toMatchObject({ id: second.id });
  });

  test("pushHistory truncates forward entries when re-opening", () => {
    const base = createSessionTab({ active: true });
    const next = createSessionTab({ active: true });

    const history = pushHistory(pushHistory(new Map(), base), next);

    const backTracked = new Map(history);
    backTracked.set(ACTIVE_TAB_SLOT_ID, {
      stack: history.get(ACTIVE_TAB_SLOT_ID)?.stack ?? [],
      currentIndex: 0,
    });

    const branched = pushHistory(backTracked, createSessionTab({ id: next.id, active: true }));
    expect(branched.get(ACTIVE_TAB_SLOT_ID)?.stack).toHaveLength(2);
  });

  test("updateHistoryCurrent replaces current stack entry", () => {
    const tab = createContactsTab({ active: true });
    const history = pushHistory(new Map(), { ...tab, active: true });

    const updated = updateHistoryCurrent(history, {
      ...tab,
      state: { selectedOrganization: "org", selectedPerson: null },
    });

    const updatedStack = updated.get(ACTIVE_TAB_SLOT_ID)?.stack ?? [];
    expect(updatedStack[updatedStack.length - 1]).toMatchObject({
      state: { selectedOrganization: "org", selectedPerson: null },
    });
  });

  test("computeHistoryFlags reflect navigation availability", () => {
    const tab = createSessionTab({ active: true });
    const history = pushHistory(new Map(), tab);

    expect(computeHistoryFlags(history, tab)).toEqual({ canGoBack: false, canGoNext: false });

    const next = createSessionTab({ active: true });
    const advanced = pushHistory(history, next);

    expect(computeHistoryFlags(advanced, next)).toEqual({ canGoBack: true, canGoNext: false });

    const backtracked = new Map(advanced);
    backtracked.set(ACTIVE_TAB_SLOT_ID, {
      stack: advanced.get(ACTIVE_TAB_SLOT_ID)?.stack ?? [],
      currentIndex: 0,
    });

    expect(computeHistoryFlags(backtracked, tab)).toEqual({ canGoBack: false, canGoNext: true });
  });
});
