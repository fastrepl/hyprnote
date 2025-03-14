import { PanelRightCloseIcon, PanelRightOpenIcon } from "lucide-react";

import Shortcut from "../../shortcut";

import { useRightPanel } from "@/contexts";
import { Button } from "@hypr/ui/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@hypr/ui/components/ui/tooltip";

export function RightPanelButton() {
  const { isExpanded, togglePanel } = useRightPanel();

  const Icon = isExpanded ? PanelRightCloseIcon : PanelRightOpenIcon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={togglePanel}
          className="hover:bg-neutral-200"
        >
          <Icon className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>
          Toggle right panel <Shortcut macDisplay="⌘R" windowsDisplay="Ctrl+R" />
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
