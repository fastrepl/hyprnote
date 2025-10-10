import { useWavesurfer } from "@wavesurfer/react";
import { Pause, Play } from "lucide-react";
import { useCallback, useRef } from "react";

export function AudioPlayer({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  const { wavesurfer, isPlaying, currentTime } = useWavesurfer({
    container: containerRef,
    height: 80,
    waveColor: "#4a5568",
    progressColor: "#2d3748",
    cursorColor: "#ffffff",
    cursorWidth: 2,
    barWidth: 2,
    barGap: 1,
    barRadius: 2,
    url,
    dragToSeek: true,
    hideScrollbar: true,
    normalize: true,
  });

  const onPlayPause = useCallback(() => {
    wavesurfer?.playPause();
  }, [wavesurfer]);

  const duration = wavesurfer?.getDuration() || 0;

  return (
    <div className="flex items-center gap-3 bg-black/90 p-4 border-t border-gray-800">
      <button
        onClick={onPlayPause}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
      >
        {isPlaying
          ? <Pause className="w-5 h-5" fill="currentColor" />
          : <Play className="w-5 h-5" fill="currentColor" />}
      </button>

      <div className="flex items-center gap-2 text-sm text-gray-400">
        <span>{formatTime(currentTime)}</span>
        <span>/</span>
        <span>{formatTime(duration)}</span>
      </div>

      <div ref={containerRef} className="flex-1" />
    </div>
  );
}

const formatTime = (seconds: number) =>
  [Math.floor(seconds / 60), Math.floor(seconds % 60)]
    .map((v) => String(v).padStart(2, "0"))
    .join(":");
