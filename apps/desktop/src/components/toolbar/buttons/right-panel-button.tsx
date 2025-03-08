import { PanelRightCloseIcon, PanelRightOpenIcon } from "lucide-react";
import { useRightPanel } from "@/contexts/right-panel";
import { Button } from "@hypr/ui/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@hypr/ui/components/ui/tooltip";
import Shortcut from "../../shortcut";

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
          className="hover:bg-neutral-200 dark:hover:bg-neutral-800 dark:text-neutral-300 dark:hover:text-neutral-100"
        >
          <Icon className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>
          Toggle right panel{" "}
          <Shortcut macDisplay="⌘R" windowsDisplay="Ctrl+R" />
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
