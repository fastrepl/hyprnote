import { CassetteTapeIcon } from "lucide-react";

import { cn } from "@hypr/ui/lib/utils";
import { useAudioPlayerContext } from "../../../../../contexts/audio-player";

export function RecordingButton({ onToggle }: { onToggle: () => void }) {
  const { currentTime } = useAudioPlayerContext();

  return (
    <button
      onClick={onToggle}
      className={cn([
        "flex items-center gap-1",
        "text-xs transition-opacity",
      ])}
    >
      <CassetteTapeIcon className="w-4 h-4" />
      <span>{formatTime(currentTime)}</span>
    </button>
  );
}

const formatTime = (seconds: number) =>
  [Math.floor(seconds / 60), Math.floor(seconds % 60)]
    .map((v) => String(v).padStart(2, "0"))
    .join(":");
