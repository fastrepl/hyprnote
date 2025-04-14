import { Trans } from "@lingui/react/macro";
import { ChevronsLeftIcon, MenuIcon } from "lucide-react";

import { useLeftSidebar } from "@/contexts";
import { Button } from "@hypr/ui/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@hypr/ui/components/ui/tooltip";
import Shortcut from "../../shortcut";

export function LeftSidebarButton({ type }: { type: "toolbar" | "sidebar" }) {
  const { isExpanded, togglePanel } = useLeftSidebar();

  const ToggleIcon = isExpanded ? ChevronsLeftIcon : MenuIcon;

  if (type === "toolbar" && isExpanded) {
    return null;
  }

  return (
    <div>
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
