import { useNavigate, useSearch } from "@tanstack/react-router";
import { type Tab } from "../types";

export function useTabs() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/app/_layout/main/" });

  const openCurrent = (newTab: Tab) => {
    const existingTabIdx = search.tabs.findIndex((t) => t.active);

    if (existingTabIdx === -1) {
      throw navigate({
        to: "/app/main",
        search: {
          tabs: search.tabs.filter((t) => t.id !== newTab.id)
            .map((t) => ({ ...t, active: false }))
            .concat([{ ...newTab, active: true }]),
        },
      });
    } else {
      const nextTabs = search.tabs.map((t, idx) =>
        idx === existingTabIdx ? { ...newTab, active: true } : { ...t, active: false }
      );

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
        tabs: search.tabs.map((t) => ({ ...t, active: false })).concat([{ ...tab, active: true }]),
      },
    });
  };

  const select = (tab: Tab) => {
    navigate({
      to: "/app/main",
      search: {
        tabs: search.tabs.map((t) => ({ ...t, active: t.id === tab.id })),
      },
    });
  };

  const close = (tab: Tab) => {
    const remainingTabs = search.tabs.filter((t) => t.id !== tab.id);

    if (remainingTabs.length === 0) {
      return navigate({ to: "/app/main", search: { tabs: [] } });
    }

    const closedTabIndex = search.tabs.findIndex((t) => t.id === tab.id);
    const nextActiveIndex = closedTabIndex < remainingTabs.length
      ? closedTabIndex
      : remainingTabs.length - 1;

    return navigate({
      to: "/app/main",
      search: { tabs: remainingTabs.map((t, idx) => ({ ...t, active: idx === nextActiveIndex })) },
    });
  };

  return {
    openCurrent,
    openNew,
    select,
    close,
  };
}
