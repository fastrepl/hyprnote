import { CassetteTapeIcon, PauseIcon, PlayIcon } from "lucide-react";

import { cn } from "@hypr/ui/lib/utils";
import { useAudioPlayerContext } from "../../../../../contexts/audio-player";

export function RecordingButton({
  isPlayerVisible,
  handleClick,
}: {
  isPlayerVisible: boolean;
  handleClick: () => void;
}) {
  return (
    <button
      onClick={handleClick}
      className={cn([
        "rounded-lg px-3.5 py-1.5",
        "shadow-[inset_0_0_0_1px_rgb(156_163_175)]",
        "flex items-center justify-center gap-1.5 shrink-0",
        "text-xs transition-opacity",
        "hover:bg-gray-100",
      ])}
    >
      {isPlayerVisible ? <WhilePlaying /> : <ClickToPlay />}
    </button>
  );
}

function ClickToPlay() {
  return (
    <div
      className={cn([
        "flex items-center justify-center gap-1.5",
        "text-xs transition-opacity",
      ])}
    >
      <PlayIcon className="w-4 h-4" />
      <span>Play</span>
    </div>
  );
}

function WhilePlaying() {
  const { currentTime, isPlaying } = useAudioPlayerContext();

  return (
    <div
      className={cn([
        "flex items-center justify-center gap-1.5",
        "text-xs transition-opacity",
      ])}
    >
      {isPlaying ? <CassetteTapeIcon className="w-4 h-4" /> : <PauseIcon className="w-4 h-4" />}
      {isPlaying ? <span>{formatTime(currentTime)}</span> : <span>Paused</span>}
    </div>
  );
}

const formatTime = (seconds: number) =>
  [Math.floor(seconds / 60), Math.floor(seconds % 60)]
    .map((v) => String(v).padStart(2, "0"))
    .join(":");
