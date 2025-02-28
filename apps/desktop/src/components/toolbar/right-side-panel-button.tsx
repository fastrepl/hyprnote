import { PanelRightCloseIcon, PanelRightOpenIcon } from "lucide-react";
import { useLocation } from "@tanstack/react-router";

import type { RoutePath } from "@/types";
import { useRightPanel } from "@/contexts/right-panel";
import { Button } from "@hypr/ui/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@hypr/ui/components/ui/tooltip";

export function RightSidePanelButton() {
  const { isExpanded, togglePanel } = useRightPanel();
  const { pathname } = useLocation();

  const checker = ("/app/note/$id" satisfies RoutePath).slice(0, 10);

  if (!pathname.includes(checker)) {
    return null;
  }

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
        <p>Toggle right panel (⌘R)</p>
      </TooltipContent>
    </Tooltip>
  );
}
