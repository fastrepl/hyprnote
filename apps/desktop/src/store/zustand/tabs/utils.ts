import type { Tab, TabHistory } from "./schema";
import { uniqueIdfromTab } from "./schema";

export const getSlotId = (tab: Tab): string => {
  return uniqueIdfromTab(tab);
};

export const computeHistoryFlags = (
  history: Map<string, TabHistory>,
  currentTab: Tab | null,
): {
  canGoBack: boolean;
  canGoNext: boolean;
} => {
  const tabHistory = currentTab ? history.get(getSlotId(currentTab)) : null;

  return {
    canGoBack: tabHistory ? tabHistory.currentIndex > 0 : false,
    canGoNext: tabHistory ? tabHistory.currentIndex < tabHistory.stack.length - 1 : false,
  };
};

export const pushHistory = (history: Map<string, TabHistory>, tab: Tab): Map<string, TabHistory> => {
  const newHistory = new Map(history);
  const slotId = getSlotId(tab);
  const existing = newHistory.get(slotId);

  const stack = existing
    ? [...existing.stack.slice(0, existing.currentIndex + 1), tab]
    : [tab];

  newHistory.set(slotId, { stack, currentIndex: stack.length - 1 });
  return newHistory;
};

export const updateHistoryCurrent = (history: Map<string, TabHistory>, tab: Tab): Map<string, TabHistory> => {
  const newHistory = new Map(history);
  const slotId = getSlotId(tab);
  const existing = newHistory.get(slotId);

  if (!existing) {
    return newHistory;
  }

  const stack = [...existing.stack];
  stack[existing.currentIndex] = tab;
  newHistory.set(slotId, { ...existing, stack });

  return newHistory;
};
