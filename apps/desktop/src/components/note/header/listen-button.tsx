import { useState } from "react";
import { Ear, EarOff } from "lucide-react";

import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@hypr/ui/components/ui/popover";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@hypr/ui/components/ui/tooltip";
import { Button } from "@hypr/ui/components/ui/button";
import AudioIndicator from "./audio-indicator";
import { cn } from "@/utils";

interface ListenButtonProps {
  isListening: boolean;
  onClick: () => void;
  onStop?: () => void;
  isCurrent: boolean;
}

export default function ListenButton({
  isListening,
  onClick,
  onStop,
  isCurrent,
}: ListenButtonProps) {
  const [open, setOpen] = useState(false);

  const handleClick = () => {
    if (!(isListening && isCurrent)) {
      onClick();
    }
  };

  const button = (
    <Button
      variant={isListening && isCurrent ? "default" : "outline"}
      onClick={handleClick}
      className={cn(
        "p-2",
        !(isListening && isCurrent)
          ? "dark:text-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:hover:text-neutral-100"
          : "dark:text-neutral-800 dark:bg-white dark:hover:bg-neutral-100 dark:hover:text-neutral-800",
      )}
    >
      {isListening && isCurrent ? <Ear size={20} /> : <EarOff size={20} />}
      {isListening && isCurrent && <AudioIndicator />}
    </Button>
  );

  if (!(isListening && isCurrent)) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="bottom" align="end">
          <p>Start recording</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>{button}</PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end">
          <p>Stop recording</p>
        </TooltipContent>
      </Tooltip>
      <PopoverContent
        className="w-60 p-4 dark:bg-neutral-800 dark:text-neutral-100"
        align="end"
      >
        <div className="flex flex-col items-center gap-3 w-full">
          <div className="text-sm font-medium">
            Stop listening to the meeting?
          </div>

          <Button
            variant="destructive"
            onClick={() => {
              onStop?.();
              setOpen(false);
            }}
            className="dark:text-neutral-100 w-full"
          >
            Stop
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
