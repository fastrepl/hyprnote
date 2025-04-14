import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery } from "@tanstack/react-query";
import { PauseIcon, StopCircleIcon } from "lucide-react";
import { useState } from "react";

import SoundIndicator from "@/components/sound-indicator";
import { commands as listenerCommands } from "@hypr/plugin-listener";
import { Button } from "@hypr/ui/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@hypr/ui/components/ui/popover";

import { AudioControlButton } from "./audio-control-button";
import type { BaseButtonProps } from "./types";

interface ActiveRecordButtonProps extends BaseButtonProps {
  onPause: () => void;
  onStop: () => void;
}

export function ActiveRecordButton({
  onClick,
  onPause,
  onStop,
}: ActiveRecordButtonProps) {
  const [open, setOpen] = useState(false);

  const { data: isMicMuted = false, refetch: refetchMicMuted } = useQuery({
    queryKey: ["mic-muted"],
    queryFn: () => listenerCommands.getMicMuted(),
    refetchOnWindowFocus: false,
    staleTime: 0,
  });

  const { data: isSpeakerMuted = false, refetch: refetchSpeakerMuted } =
    useQuery({
      queryKey: ["speaker-muted"],
      queryFn: () => listenerCommands.getSpeakerMuted(),
      refetchOnWindowFocus: false,
      staleTime: 0,
    });

  const toggleMicMuted = useMutation({
    mutationFn: async () => {
      console.log("마이크 토글: 현재 상태", isMicMuted);
      await listenerCommands.setMicMuted(!isMicMuted);
      return undefined;
    },
    onSuccess: () => {
      console.log("마이크 토글 성공, 상태 갱신");
      refetchMicMuted();
    },
  });

  const toggleSpeakerMuted = useMutation({
    mutationFn: async () => {
      console.log("스피커 토글: 현재 상태", isSpeakerMuted);
      await listenerCommands.setSpeakerMuted(!isSpeakerMuted);
      return undefined;
    },
    onSuccess: () => {
      console.log("스피커 토글 성공, 상태 갱신");
      refetchSpeakerMuted();
    },
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          onClick={onClick}
          className="w-14 h-9 rounded-full bg-red-100 border-2 transition-all border-red-400 cursor-pointer outline-none p-0 flex items-center justify-center"
          style={{
            boxShadow: "0 0 0 2px rgba(255, 255, 255, 0.8) inset",
          }}
        >
          <SoundIndicator color="#ef4444" size="long" />
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-60" align="end">
        <div className="flex gap-2 mb-4">
          <AudioControlButton
            isMuted={isMicMuted}
            onToggle={() => toggleMicMuted.mutate()}
            type="mic"
          />
          <AudioControlButton
            isMuted={isSpeakerMuted}
            onToggle={() => toggleSpeakerMuted.mutate()}
            type="speaker"
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              onPause();
              setOpen(false);
            }}
            className="w-full"
          >
            <PauseIcon size={16} />
            <Trans>Pause</Trans>
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onStop();
              setOpen(false);
            }}
            className="w-full"
          >
            <StopCircleIcon size={16} />
            <Trans>Stop</Trans>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
