import { MicIcon, MicOffIcon, Volume2Icon, VolumeOffIcon } from "lucide-react";

import SoundIndicator from "@/components/sound-indicator";
import { Button } from "@hypr/ui/components/ui/button";
import type { AudioControlButtonProps } from "./types";

export function AudioControlButton({
  isMuted,
  onToggle,
  type,
}: AudioControlButtonProps) {
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
