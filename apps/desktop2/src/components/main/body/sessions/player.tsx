import { Pause, Play } from "lucide-react";

import { cn } from "@hypr/ui/lib/utils";
import { useAudioPlayerContext } from "../../../../contexts/audio-player";

export function AudioPlayer() {
  const { registerContainer, isPlaying, currentTime, duration, togglePlay } = useAudioPlayerContext();

  return (
    <div className={cn(["w-full", "bg-gray-50 rounded-lg"])}>
      <div className={cn(["flex items-center gap-2.5", "px-4 py-2", "w-full max-w-full"])}>
        <button
          onClick={togglePlay}
          className={cn([
            "flex items-center justify-center",
            "w-8 h-8 rounded-full",
            "bg-white border border-gray-200",
            "hover:bg-gray-100 transition-colors",
            "flex-shrink-0 shadow-sm",
          ])}
        >
          {isPlaying
            ? <Pause className={cn(["w-4 h-4", "text-gray-900"])} fill="currentColor" />
            : <Play className={cn(["w-4 h-4", "text-gray-900"])} fill="currentColor" />}
        </button>

        <div className={cn(["flex items-center gap-1.5", "text-xs text-gray-600", "flex-shrink-0 min-w-[85px]"])}>
          <span>{formatTime(currentTime)}</span>
          <span>/</span>
          <span>{formatTime(duration)}</span>
        </div>

        <div ref={registerContainer} className={cn(["flex-1 min-w-0"])} style={{ minHeight: "30px", width: "100%" }} />
      </div>
    </div>
  );
}

const formatTime = (seconds: number) =>
  [Math.floor(seconds / 60), Math.floor(seconds % 60)]
    .map((v) => String(v).padStart(2, "0"))
    .join(":");
