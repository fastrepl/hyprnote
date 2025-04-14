import { Trans } from "@lingui/react/macro";
import { PanelRightClose, PanelRightOpen } from "lucide-react";

import { useRightPanel } from "@/contexts";
import { Button } from "@hypr/ui/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@hypr/ui/components/ui/tooltip";
import { cn } from "@hypr/ui/lib/utils";
import Shortcut from "../../shortcut";

export function WidgetPanelButton() {
  const { isExpanded, currentView, togglePanel } = useRightPanel();

  const isActive = isExpanded && currentView === "widget";

  const handleClick = () => {
    togglePanel("widget");
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClick}
          className={cn(
            "hover:bg-neutral-300 text-xs",
            isActive && "bg-neutral-200",
          )}
        >
          {!isExpanded ? <PanelRightOpen className="size-4" /> : <PanelRightClose className="size-4" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>
          <Trans>Toggle widget panel</Trans> <Shortcut macDisplay="⌘R" windowsDisplay="Ctrl+R" />
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
