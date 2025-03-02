import { ChevronsLeftIcon, MenuIcon } from "lucide-react";

import { useLeftSidebar } from "@/contexts/left-sidebar";
import { Button } from "@hypr/ui/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@hypr/ui/components/ui/tooltip";

export function LeftSidebarButton() {
  const { isExpanded, togglePanel } = useLeftSidebar();

  const Icon = isExpanded ? ChevronsLeftIcon : MenuIcon;

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
        <p>Toggle left sidebar (⌘L)</p>
      </TooltipContent>
    </Tooltip>
  );
}
