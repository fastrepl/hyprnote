import { Ear, EarOff } from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@hypr/ui/components/ui/popover";
import { Button } from "@hypr/ui/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@hypr/ui/components/ui/tooltip";
import AudioIndicator from "./audio-indicator";
import { cn } from "@/utils";

interface ListenButtonProps {
  isListening: boolean;
  onClick: () => void;
  onStop?: () => void;
}

export default function ListenButton({
  isListening,
  onClick,
  onStop,
}: ListenButtonProps) {
  const handleClick = () => {
    if (!isListening) {
      onClick();
    }
  };

  const button = (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={isListening ? "default" : "outline"}
          onClick={handleClick}
          className={cn(
            "p-2",
            "dark:text-neutral-100 dark:bg-neutral-800",
            "dark:hover:bg-neutral-700 dark:hover:text-neutral-100",
          )}
        >
          {isListening ? <Ear size={20} /> : <EarOff size={20} />}
          {isListening && <AudioIndicator />}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" align="end">
        <p>{isListening ? "Stop recording" : "Start recording"}</p>
      </TooltipContent>
    </Tooltip>
  );

  if (!isListening) {
    return button;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>{button}</PopoverTrigger>
      <PopoverContent className="w-fit" align="end">
        <div className="flex flex-col items-center gap-3 py-1">
          <div className="text-sm font-medium">Is your meeting over?</div>
          <div className="flex justify-end gap-2">
            <Button variant="destructive" onClick={onStop}>
              Yes, stop recording
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
