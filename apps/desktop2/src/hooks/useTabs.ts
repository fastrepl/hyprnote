import { useNavigate, useSearch } from "@tanstack/react-router";
import { type Tab } from "../types";

export function useTabs() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/app/_layout/main/" });

  const openCurrent = (tab: Tab) => {
    navigate({
      to: "/app/main",
      search: { activeTab: tab, inactiveTabs: search.inactiveTabs.filter((t) => t.id !== tab.id) },
    });
  };

  const openNew = (tab: Tab) => {
    navigate({
      to: "/app/main",
      search: { activeTab: tab, inactiveTabs: [...search.inactiveTabs, tab] },
    });
  };

  const select = (tab: Tab) => {
    navigate({
      to: "/app/main",
      search: { activeTab: tab, inactiveTabs: search.inactiveTabs.filter((t) => t.id !== tab.id) },
    });
  };

  const close = (tab: Tab) => {
    if (search.inactiveTabs?.length > 0) {
      const nextActiveTab = search.inactiveTabs[0];

      navigate({
        to: "/app/main",
        search: {
          activeTab: nextActiveTab,
          inactiveTabs: search.inactiveTabs.filter((t) => [nextActiveTab.id, tab.id].includes(t.id)),
        },
      });
    } else {
      navigate({ to: "/app/new" });
    }
  };

  return {
    openCurrent,
    openNew,
    select,
    close,
  };
}
