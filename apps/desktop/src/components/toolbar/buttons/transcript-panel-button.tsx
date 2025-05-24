import { Trans } from "@lingui/react/macro";
import { CaptionsIcon } from "lucide-react";

import { useRightPanel } from "@/contexts";
import { Button } from "@hypr/ui/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@hypr/ui/components/ui/tooltip";
import { cn } from "@hypr/ui/lib/utils";
import Shortcut from "../../shortcut";

export function TranscriptPanelButton() {
  const { isExpanded, togglePanel } = useRightPanel();

  const handleClick = () => {
    togglePanel("transcript");
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
            isExpanded && "bg-neutral-200",
          )}
        >
          <CaptionsIcon className="size-4" />
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
