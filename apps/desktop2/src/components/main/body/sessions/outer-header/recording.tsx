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
      className="w-[80px] border border-gray-400 rounded-md px-2 py-0.5"
    >
      {isPlayerVisible ? <WhilePlaying /> : <ClickToPlay />}
    </button>
  );
}

function ClickToPlay() {
  return (
    <div
      className={cn([
        "flex items-center justify-center gap-1",
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
        "flex items-center justify-center gap-1",
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
