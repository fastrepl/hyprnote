import { Pause, Play } from "lucide-react";
import { useAudioPlayerContext } from "../../../../contexts/audio-player";

export function AudioPlayer() {
  const { registerContainer, isPlaying, currentTime, duration, togglePlay } = useAudioPlayerContext();

  return (
    <div className="absolute bottom-0 left-0 right-0 w-full bg-zinc-50 border-t border-zinc-200 z-50">
      <div className="flex items-center gap-2.5 px-4 py-2 w-full max-w-full">
        <button
          onClick={togglePlay}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-white border border-zinc-200 hover:bg-zinc-100 transition-colors flex-shrink-0 shadow-sm"
        >
          {isPlaying
            ? <Pause className="w-4 h-4 text-zinc-900" fill="currentColor" />
            : <Play className="w-4 h-4 text-zinc-900" fill="currentColor" />}
        </button>

        <div className="flex items-center gap-1.5 text-xs text-zinc-600 flex-shrink-0 min-w-[85px]">
          <span>{formatTime(currentTime)}</span>
          <span>/</span>
          <span>{formatTime(duration)}</span>
        </div>

        <div ref={registerContainer} className="flex-1 min-w-0" style={{ minHeight: "30px", width: "100%" }} />
      </div>
    </div>
  );
}

const formatTime = (seconds: number) =>
  [Math.floor(seconds / 60), Math.floor(seconds % 60)]
    .map((v) => String(v).padStart(2, "0"))
    .join(":");
