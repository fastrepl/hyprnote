import { useNavigate, useSearch } from "@tanstack/react-router";
import { isSameTab, type Tab } from "../types";

export function useTabs() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/app/main/_layout/" });

  const openCurrent = (newTab: Tab) => {
    const existingTabIdx = search.tabs.findIndex((t) => t.active);

    if (existingTabIdx === -1) {
      throw navigate({
        to: "/app/main",
        search: {
          tabs: search.tabs.filter((t) => !isSameTab(t, newTab))
            .map((t) => ({ ...t, active: false }))
            .concat([{ ...newTab, active: true }]),
        },
      });
    } else {
      const nextTabs = search.tabs
        .map((t, idx) =>
          idx === existingTabIdx
            ? { ...newTab, active: true }
            : isSameTab(t, newTab)
            ? null
            : { ...t, active: false }
        )
        .filter((t): t is Tab => t !== null);

      navigate({
        to: "/app/main",
        search: { tabs: nextTabs },
      });
    }
  };

  const openNew = (tab: Tab) => {
    navigate({
      to: "/app/main",
      search: {
        tabs: search.tabs.filter((t) => !isSameTab(t, tab))
          .map((t) => ({ ...t, active: false }))
          .concat([{ ...tab, active: true }]),
      },
    });
  };

  const select = (tab: Tab) => {
    navigate({
      to: "/app/main",
      search: {
        tabs: search.tabs.map((t) => ({ ...t, active: isSameTab(t, tab) })),
      },
    });
  };

  const close = (tab: Tab) => {
    const remainingTabs = search.tabs.filter((t) => !isSameTab(t, tab));

    if (remainingTabs.length === 0) {
      return navigate({ to: "/app/main", search: { tabs: [] } });
    }

    const closedTabIndex = search.tabs.findIndex((t) => isSameTab(t, tab));
    const nextActiveIndex = closedTabIndex < remainingTabs.length
      ? closedTabIndex
      : remainingTabs.length - 1;

    return navigate({
      to: "/app/main",
      search: { tabs: remainingTabs.map((t, idx) => ({ ...t, active: idx === nextActiveIndex })) },
    });
  };

  const reorder = (newOrder: Tab[]) => {
    navigate({
      to: "/app/main",
      search: { tabs: newOrder },
    });
  };

  return {
    currentTab: search.tabs.find((t) => t.active),
    openCurrent,
    openNew,
    select,
    close,
    reorder,
  };
}
