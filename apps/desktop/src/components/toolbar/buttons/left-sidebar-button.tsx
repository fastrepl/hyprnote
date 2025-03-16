import { useQuery } from "@tanstack/react-query";
import { type as getOsType } from "@tauri-apps/plugin-os";
import { CalendarDaysIcon, ChevronsLeftIcon, MenuIcon } from "lucide-react";

import { useLeftSidebar } from "@/contexts";
import { commands as windowsCommands } from "@hypr/plugin-windows";
import { Button } from "@hypr/ui/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@hypr/ui/components/ui/tooltip";

import { cn } from "@hypr/ui/lib/utils";
import { Trans } from "@lingui/react/macro";
import Shortcut from "../../shortcut";

export function LeftSidebarButton({ type }: { type: "toolbar" | "sidebar" }) {
  const osType = useQuery({
    queryKey: ["osType"],
    queryFn: () => getOsType(),
    staleTime: Infinity,
  });

  const { isExpanded, togglePanel } = useLeftSidebar();

  const ToggleIcon = isExpanded ? ChevronsLeftIcon : MenuIcon;

  if (type === "toolbar" && isExpanded) {
    return null;
  }

  const handleClickCalendar = () => {
    windowsCommands.windowShow("calendar");
  };

  return (
    <div className={cn(osType.data === "macos" && "pl-[68px]")}>
      {isExpanded && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClickCalendar}
          className="hover:bg-neutral-200"
        >
          <CalendarDaysIcon className="size-4" />
        </Button>
      )}

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={togglePanel}
            className="hover:bg-neutral-200"
          >
            <ToggleIcon className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            <Trans>Toggle left sidebar</Trans> <Shortcut macDisplay="⌘L" windowsDisplay="Ctrl+L" />
          </p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
