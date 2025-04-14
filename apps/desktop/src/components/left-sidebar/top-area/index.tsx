import { useQuery } from "@tanstack/react-query";
import { type as getOsType } from "@tauri-apps/plugin-os";

import { LeftSidebarButton } from "@/components/toolbar/buttons/left-sidebar-button";
import { cn } from "@hypr/ui/lib/utils";
import { CalendarButton } from "./calendar-button";
import { SettingsButton } from "./settings-button";

export function TopArea() {
  const osType = useQuery({
    queryKey: ["osType"],
    queryFn: () => getOsType(),
    staleTime: Infinity,
  });

  return (
    <div
      data-tauri-drag-region
      className={cn(
        "flex items-center justify-end min-h-11 pr-2",
        osType.data === "macos" && "pl-[68px]"
      )}
    >
      <SettingsButton />

      <CalendarButton />

      <LeftSidebarButton type="sidebar" />
    </div>
  );
}
