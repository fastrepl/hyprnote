import { ClockIcon, PlusIcon } from "lucide-react";

import { Button } from "@hypr/ui/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@hypr/ui/components/ui/tooltip";

interface FloatingActionButtonsProps {
  onNewChat: () => void;
  onViewHistory: () => void;
}

export function FloatingActionButtons({ onNewChat, onViewHistory }: FloatingActionButtonsProps) {
  return (
    <TooltipProvider>
      <div className="absolute top-4 right-4 z-10 flex group border rounded-lg overflow-clip divide-x bg-background/40 group-hover:bg-background transition-colors">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="opacity-20 group-hover:opacity-100 transition-opacity rounded-none"
              onClick={onNewChat}
            >
              <PlusIcon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="end">
            <p>New Chat</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="opacity-20 group-hover:opacity-100 transition-opacity rounded-none"
              onClick={onViewHistory}
            >
              <ClockIcon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="end">
            <p>View History</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
