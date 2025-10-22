import type { Tab, TabHistory } from "./schema";
import { uniqueIdfromTab } from "./schema";

export const ACTIVE_TAB_SLOT_ID = "active-tab-history";

export const getSlotId = (tab: Tab): string => {
  return tab.active ? ACTIVE_TAB_SLOT_ID : `inactive-${uniqueIdfromTab(tab)}`;
};

export const computeHistoryFlags = (
  history: Map<string, TabHistory>,
  currentTab: Tab | null,
): { canGoBack: boolean; canGoNext: boolean } => {
  if (!currentTab) {
    return { canGoBack: false, canGoNext: false };
  }
  const slotId = getSlotId(currentTab);
  const tabHistory = history.get(slotId);
  if (!tabHistory) {
    return { canGoBack: false, canGoNext: false };
  }
  return {
    canGoBack: tabHistory.currentIndex > 0,
    canGoNext: tabHistory.currentIndex < tabHistory.stack.length - 1,
  };
};

export const pushHistory = (history: Map<string, TabHistory>, tab: Tab): Map<string, TabHistory> => {
  const newHistory = new Map(history);
  const slotId = getSlotId(tab);
  const existing = newHistory.get(slotId);

  if (existing) {
    const newStack = existing.stack.slice(0, existing.currentIndex + 1);
    newStack.push(tab);
    newHistory.set(slotId, { stack: newStack, currentIndex: newStack.length - 1 });
  } else {
    newHistory.set(slotId, { stack: [tab], currentIndex: 0 });
  }

  return newHistory;
};

export const updateHistoryCurrent = (history: Map<string, TabHistory>, tab: Tab): Map<string, TabHistory> => {
  const newHistory = new Map(history);
  const slotId = getSlotId(tab);
  const existing = newHistory.get(slotId);

  if (existing && existing.currentIndex >= 0) {
    const newStack = [...existing.stack];
    newStack[existing.currentIndex] = tab;
    newHistory.set(slotId, { ...existing, stack: newStack });
  }

  return newHistory;
};
