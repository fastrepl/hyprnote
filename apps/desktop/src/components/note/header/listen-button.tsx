import { Ear, EarOff, Mic, MicIcon, SpeakerIcon } from "lucide-react";
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

      <PopoverContent className="w-60 p-0" align="end">
        <div className="flex flex-col w-full">
          <div className="flex w-full justify-between">
            <div className="flex-1 flex items-center gap-2 border-r border-neutral-200 pl-2 pr-4 py-4 justify-center">
              <Button variant="ghost" size="icon">
                <MicIcon size={20} />
              </Button>
              <SoundIndicator theme="light" input="mic" size="long" />
            </div>

            <div className="flex-1 flex items-center gap-2 pl-2 pr-4 py-4 justify-center">
              <Button variant="ghost" size="icon">
                <SpeakerIcon size={20} />
              </Button>
              <SoundIndicator theme="light" input="speaker" size="long" />
            </div>
          </div>

          <div className="border-t border-neutral-200 w-full" />

          <div className="flex flex-col items-center gap-3 p-4">
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
        </div>
      </PopoverContent>
    </Popover>
  );
}
