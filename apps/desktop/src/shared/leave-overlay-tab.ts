import {
  RETURN_ORIGIN_TAB_TYPES,
  uniqueIdfromTab,
  useTabs,
} from "~/store/zustand/tabs";

export function leaveAllOverlayTabs() {
  for (let attempt = 0; attempt < 10; attempt++) {
    const { currentTab } = useTabs.getState();
    if (!currentTab) return;
    if (!RETURN_ORIGIN_TAB_TYPES.includes(currentTab.type)) return;
    const { slotId } = currentTab;
    leaveOverlayTab();
    if (useTabs.getState().currentTab?.slotId === slotId) return;
  }
}

export function leaveOverlayTab() {
  const { tabs, currentTab, openCurrent, select, goBack, canGoBack } =
    useTabs.getState();

  if (currentTab?.type === "onboarding" || currentTab?.type === "empty") {
    return;
  }

  const returnToSlotId = currentTab?.returnToSlotId;
  const returnToTab = returnToSlotId
    ? tabs.find(
        (tab) =>
          tab.slotId === returnToSlotId &&
          tab.slotId !== currentTab.slotId &&
          (!currentTab.returnToTabId ||
            uniqueIdfromTab(tab) === currentTab.returnToTabId),
      )
    : null;
  if (returnToTab) {
    select(returnToTab);
    return;
  }

  if (returnToSlotId === currentTab?.slotId && canGoBack) {
    goBack();
    return;
  }

  const existingHomeTab = tabs.find((tab) => tab.type === "empty");
  if (existingHomeTab) {
    select(existingHomeTab);
    return;
  }

  openCurrent({ type: "empty" });
}
