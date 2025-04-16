import { Trans } from "@lingui/react/macro";
import { MicIcon, MicOffIcon, PlayIcon, StopCircleIcon, Volume2Icon, VolumeOffIcon } from "lucide-react";
import { type AnimationProps, motion, type MotionProps } from "motion/react";
import { useEffect, useState } from "react";

import SoundIndicator from "@/components/sound-indicator";
import { commands as listenerCommands } from "@hypr/plugin-listener";
import { Button } from "@hypr/ui/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@hypr/ui/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@hypr/ui/components/ui/tooltip";
import { cn } from "@hypr/ui/lib/utils";
import { useMutation, useQuery } from "@tanstack/react-query";

interface OnboardingVideoButtonProps {
  ongoingSessionStatus: string;
  playVideo: () => void;
  stopVideo: () => void;
  isEnhanced?: boolean;
}

interface ShinyButtonProps extends Omit<React.HTMLAttributes<HTMLElement>, keyof MotionProps>, MotionProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

const animationProps = {
  initial: { "--x": "100%" },
  animate: { "--x": "-100%" },
  whileTap: { scale: 0.95 },
  transition: {
    repeat: Infinity,
    repeatType: "loop",
    repeatDelay: 1,
    duration: 1.5,
  },
} as AnimationProps;

function ShinyButton({ children, className, onClick, ...props }: ShinyButtonProps) {
  return (
    <motion.button
      className={cn(
        "relative transition-all hover:scale-95 cursor-pointer outline-none flex items-center justify-center p-0",
        className,
      )}
      onClick={onClick}
      {...animationProps}
      {...props}
    >
      <span
        className="relative flex items-center justify-center w-full h-full"
        style={{
          maskImage:
            "linear-gradient(-75deg,rgba(255,255,255,1) calc(var(--x) + 20%),transparent calc(var(--x) + 30%),rgba(255,255,255,1) calc(var(--x) + 100%))",
        }}
      >
        {children}
      </span>
      <span
        style={{
          mask: "linear-gradient(rgb(0,0,0), rgb(0,0,0)) content-box exclude,linear-gradient(rgb(0,0,0), rgb(0,0,0))",
          WebkitMask:
            "linear-gradient(rgb(0,0,0), rgb(0,0,0)) content-box exclude,linear-gradient(rgb(0,0,0), rgb(0,0,0))",
          backgroundImage:
            "linear-gradient(-75deg,rgba(255,255,255,0.1) calc(var(--x)+20%),rgba(255,255,255,0.5) calc(var(--x)+25%),rgba(255,255,255,0.1) calc(var(--x)+100%))",
        }}
        className="absolute inset-0 z-10 block rounded-[inherit] p-px"
      >
      </span>
    </motion.button>
  );
}

export default function OnboardingVideoButton({
  ongoingSessionStatus,
  playVideo,
  stopVideo,
  isEnhanced = false,
}: OnboardingVideoButtonProps) {
  const [open, setOpen] = useState(false);

  const { data: isMicMuted, refetch: refetchMicMuted } = useQuery({
    queryKey: ["mic-muted"],
    queryFn: () => listenerCommands.getMicMuted(),
  });

  const { data: isSpeakerMuted, refetch: refetchSpeakerMuted } = useQuery({
    queryKey: ["speaker-muted"],
    queryFn: () => listenerCommands.getSpeakerMuted(),
  });

  useEffect(() => {
    refetchMicMuted();
    refetchSpeakerMuted();
  }, [ongoingSessionStatus, refetchMicMuted, refetchSpeakerMuted]);

  const toggleMicMuted = useMutation({
    mutationFn: () => listenerCommands.setMicMuted(!isMicMuted),
    onSuccess: () => {
      refetchMicMuted();
    },
  });

  const toggleSpeakerMuted = useMutation({
    mutationFn: () => listenerCommands.setSpeakerMuted(!isSpeakerMuted),
    onSuccess: () => {
      refetchSpeakerMuted();
    },
  });

  if (ongoingSessionStatus === "inactive" && !isEnhanced) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <ShinyButton
            onClick={playVideo}
            className={cn([
              "w-24 h-9 rounded-full border-2 transition-all cursor-pointer outline-none p-0 flex items-center justify-center gap-1",
              "bg-neutral-800 border-neutral-700 text-white text-xs font-medium",
            ])}
            style={{
              boxShadow: "0 0 0 2px rgba(255, 255, 255, 0.8) inset",
            }}
          >
            <PlayIcon size={14} />
            <Trans>Play video</Trans>
          </ShinyButton>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end">
          <p>
            <Trans>Start onboarding video</Trans>
          </p>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (ongoingSessionStatus === "running_active") {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn([
              open && "hover:scale-95",
              "w-14 h-9 rounded-full bg-red-100 border-2 transition-all border-red-400 cursor-pointer outline-none p-0 flex items-center justify-center",
            ])}
            style={{
              boxShadow: "0 0 0 2px rgba(255, 255, 255, 0.8) inset",
            }}
          >
            <SoundIndicator color="#ef4444" size="long" />
          </button>
        </PopoverTrigger>

        <PopoverContent className="w-60" align="end">
          <div className="flex w-full justify-between mb-4">
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
              variant="destructive"
              onClick={stopVideo}
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

  return (
    <button
      onClick={playVideo}
      className={cn(
        "w-28 h-9 rounded-full transition-all hover:scale-95 cursor-pointer outline-none p-0 flex items-center justify-center gap-1 text-xs font-medium",
        "bg-neutral-200 border-2 border-neutral-400 text-neutral-600",
        "hover:bg-neutral-300 hover:text-neutral-800 hover:border-neutral-500",
      )}
      style={{ boxShadow: "0 0 0 2px rgba(255, 255, 255, 0.8) inset" }}
    >
      <PlayIcon size={14} />
      <Trans>Play again</Trans>
    </button>
  );
}

function AudioControlButton({
  isMuted,
  onToggle,
  type,
}: {
  isMuted?: boolean;
  onToggle: () => void;
  type: "mic" | "speaker";
}) {
  const Icon = type === "mic"
    ? isMuted
      ? MicOffIcon
      : MicIcon
    : isMuted
    ? VolumeOffIcon
    : Volume2Icon;

  return (
    <Button variant="ghost" size="icon" onClick={onToggle} className="w-full">
      <Icon className={isMuted ? "text-neutral-500" : ""} size={20} />
      <SoundIndicator input={type} size="long" />
    </Button>
  );
}
