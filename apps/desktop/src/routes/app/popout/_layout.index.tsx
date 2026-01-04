import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useMemo } from "react";

import type { TabInput } from "@hypr/plugin-windows";

import { PopoutContent } from "../../../components/popout/content";
import { getDefaultState, type Tab } from "../../../store/zustand/tabs/schema";

export const Route = createFileRoute("/app/popout/_layout/")({
  component: Component,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      tab: search.tab as string | undefined,
    };
  },
});

function Component() {
  const { tab: tabJson } = useSearch({ from: "/app/popout/_layout/" });

  const tab = useMemo<Tab | null>(() => {
    if (!tabJson) return null;

    try {
      const tabInput = JSON.parse(tabJson) as TabInput;
      const tab = getDefaultState(tabInput);
      tab.active = true;
      tab.slotId = `popout-${Date.now()}`;
      return tab;
    } catch (e) {
      console.error("Failed to parse tab from URL:", e);
      return null;
    }
  }, [tabJson]);

  if (!tab) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-neutral-500">No tab specified</p>
      </div>
    );
  }

  return <PopoutContent tab={tab} />;
}
