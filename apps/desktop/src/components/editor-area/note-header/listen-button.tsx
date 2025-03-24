import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EarIcon, EarOffIcon, MicIcon, SpeakerIcon } from "lucide-react";
import { useEffect, useState } from "react";

import SoundIndicator from "@/components/sound-indicator";
import { commands as listenerCommands } from "@hypr/plugin-listener";
import { Button } from "@hypr/ui/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@hypr/ui/components/ui/tooltip";

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
  const queryClient = useQueryClient();

  const handleClick = () => {
    if (!(isListening && isCurrent)) {
      onClick();
    }
  };

  const micMuted = useQuery({
    queryKey: ["mic-muted"],
    queryFn: () => listenerCommands.getMicMuted(),
  });

  const speakerMuted = useQuery({
    queryKey: ["speaker-muted"],
    queryFn: () => listenerCommands.getSpeakerMuted(),
  });

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["mic-muted"] });
    queryClient.invalidateQueries({ queryKey: ["speaker-muted"] });
  }, [isListening]);

  const toggleMicMuted = useMutation({
    mutationFn: () => listenerCommands.setMicMuted(!micMuted.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mic-muted"] });
    },
  });

  const toggleSpeakerMuted = useMutation({
    mutationFn: () => listenerCommands.setSpeakerMuted(!speakerMuted.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["speaker-muted"] });
    },
  });

  const button = (
    <Button
      variant={isListening && isCurrent ? "default" : "outline"}
      onClick={handleClick}
      className="p-2"
    >
      {isListening && isCurrent ? <EarIcon size={20} /> : <EarOffIcon size={20} />}
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
              <Button variant="ghost" size="icon" onClick={() => toggleMicMuted.mutate()}>
                {micMuted.data
                  ? (
                    <>
                      <MicIcon size={20} />
                      <SoundIndicator theme="light" input="mic" size="long" />
                    </>
                  )
                  : (
                    <>
                      <MicIcon className="text-neutral-500" size={20} />
                      <div className="w-8 h-0.5 bg-neutral-500 opacity-50 rounded-full" />
                    </>
                  )}
              </Button>
            </div>

            <div className="flex-1 flex items-center gap-2 pl-2 pr-4 py-4 justify-center">
              <Button variant="ghost" size="icon" onClick={() => toggleSpeakerMuted.mutate()}>
                {speakerMuted.data
                  ? (
                    <>
                      <SpeakerIcon size={20} />
                      <SoundIndicator theme="light" input="speaker" size="long" />
                    </>
                  )
                  : (
                    <>
                      <SpeakerIcon className="text-neutral-500" size={20} />
                      <div className="w-8 h-0.5 bg-neutral-500 opacity-50 rounded-full" />
                    </>
                  )}
              </Button>
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
