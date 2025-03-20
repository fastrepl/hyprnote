import { Ear, EarOff } from "lucide-react";
import { useState } from "react";

import SoundIndicator from "@/components/sound-indicator";

import { Button } from "@hypr/ui/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@hypr/ui/components/ui/tooltip";
import { Trans } from "@lingui/react/macro";

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
      className="p-2"
    >
      {isListening && isCurrent ? <Ear size={20} /> : <EarOff size={20} />}
      {isListening && isCurrent && <SoundIndicator theme="dark" />}
    </Button>
  );

  if (!(isListening && isCurrent)) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="bottom" align="end">
          <p>
            <Trans>Start recording</Trans>
          </p>
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
          <p>
            <Trans>Stop recording</Trans>
          </p>
        </TooltipContent>
      </Tooltip>
      <PopoverContent className="w-60 p-4" align="end">
        <div className="flex flex-col items-center gap-3 w-full">
          <div className="text-sm font-medium">
            <Trans>Stop listening to the meeting?</Trans>
          </div>

          <Button
            variant="destructive"
            onClick={() => {
              onStop?.();
              setOpen(false);
            }}
            className=" w-full"
          >
            <Trans>Stop</Trans>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
